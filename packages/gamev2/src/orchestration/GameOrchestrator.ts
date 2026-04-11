import { ID, Values, GameMap, resolveTurn, Utils } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { UserActionDispatch } from '../state/types';
import { GameRenderer } from '../rendering/GameRenderer';
import { ResolutionRunner } from './ResolutionRunner';
import { UnitMeshSyncer } from './UnitMeshSyncer';
import { OverlaySyncer } from './OverlaySyncer';
import { GameProvider } from '../providers/GameProvider';
import type { RenderMap } from '../map/MapParser';
import { getValidDestinations } from './Utils';

/**
 * Central coordinator. Owns GameStore, GameRenderer, ResolutionRunner, GameProvider.
 * Handles input (click -> select/move/action logic), action submission, turn flow
 * state machine, and post-resolution sync.
 *
 * Implements UserActionDispatch so it can be provided to React via context.
 */
export class GameOrchestrator implements UserActionDispatch {
  readonly store: GameStore;
  private renderer: GameRenderer;
  private resolutionRunner: ResolutionRunner;
  private unitMeshSyncer: UnitMeshSyncer | null = null;
  private overlaySyncer: OverlaySyncer | null = null;
  private provider: GameProvider;
  private renderMap: RenderMap | null = null;

  // Resolution control
  private advanceResolve: ((value: 'next' | 'skip') => void) | null = null;
  private abortController: AbortController | null = null;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider) {
    this.store = store;
    this.renderer = renderer;
    this.resolutionRunner = new ResolutionRunner(store, renderer);
    this.provider = provider;
  }

  /**
   * Initialise the orchestrator: load game from provider, set up renderer,
   * register input callbacks.
   */
  async initialise(renderMap: RenderMap): Promise<void> {
    this.renderMap = renderMap;

    const game = await this.provider.get();
    const map = new GameMap(game.latestMap);

    this.store.setState({
      game,
      map,
      mapRevision: 0,
      currentPlayerId: map.playerIds[0],
      turn: game.turn,
      turnPhase: 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hover: null,
      currentResolution: null,
      visibilityMode: 'all',
    });

    await this.renderer.initialise(renderMap, map);

    // Register input callbacks
    this.renderer.onTerritoryClick((territoryId) => this.handleTerritoryClick(territoryId));
    this.renderer.onUnitClick((unitId) => this.handleUnitClick(unitId));
    this.renderer.onHover((hover) => this.store.setState({ hover }));

    // Construct renderer-side syncers. These subscribe to the store and reflect
    // map state into the renderer automatically — no manual sync calls needed.
    this.unitMeshSyncer = new UnitMeshSyncer(this.store, this.renderer.getUnitRenderer());
    this.overlaySyncer = new OverlaySyncer(this.store, this.renderer);
  }

  dispose(): void {
    this.unitMeshSyncer?.dispose();
    this.overlaySyncer?.dispose();
  }

  // --- UserActionDispatch implementation ---

  onReadyPlayer(): void {
    const { map, currentPlayerId, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Apply ready action
    map.applyAction({ type: 'ready-player', playerId: currentPlayerId, isReady: true });
    this.store.setState({ map });

    // Cycle to next player or trigger resolution
    const playerIds = map.playerIds;
    const currentIdx = playerIds.indexOf(currentPlayerId);

    if (currentIdx < playerIds.length - 1) {
      // Next player's turn to plan
      const nextPlayerId = playerIds[currentIdx + 1];
      this.store.setState({
        currentPlayerId: nextPlayerId,
        selectedUnitIds: [],
        selectedTerritoryId: null,
      });
    } else {
      // All players ready — resolve the turn
      this.onAllPlayersReady();
    }
  }

  onResolveNext(): void {
    if (this.advanceResolve) {
      this.advanceResolve('next');
      this.advanceResolve = null;
    }
  }

  onSkipResolution(): void {
    if (this.advanceResolve) {
      this.advanceResolve('skip');
      this.advanceResolve = null;
    }
  }

  onSetTurn(turn: number): void {
    // Abort current resolution if replaying
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.advanceResolve = null;
    }

    const { game } = this.store.getState();
    if (turn < 1 || turn > game.turn) return;

    const isReplaying = turn < game.turn;
    const mapData = game.data.maps[turn - 1];
    const map = new GameMap(isReplaying ? Utils.clone(mapData) : mapData);

    this.store.setState({
      map,
      turn,
      turnPhase: isReplaying ? 'replaying' : 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
    });

    if (isReplaying) {
      this.startResolution(map);
    }
  }

  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    try {
      map.applyAction({ type: 'territory', territoryId, action });
      this.store.setState({ map });
    } catch (e) {
      console.warn('[GameOrchestrator] Territory action failed:', e);
    }
  }

  onCancelTerritoryAction(territoryId: ID): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Passing a null action refunds and removes the pending action
    // (see packages/models/src/actions/territory.ts).
    try {
      map.applyAction({ type: 'territory', territoryId, action: null as any });
      this.store.setState({ map });
    } catch (e) {
      console.warn('[GameOrchestrator] Cancel territory action failed:', e);
    }
  }

  onCancelMove(unitIds: ID[]): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Apply move with null destination to cancel
    try {
      map.applyAction({ type: 'move-units', unitIds, destinationId: null as any });
      this.store.setState({ map, selectedUnitIds: [] });
    } catch (e) {
      console.warn('[GameOrchestrator] Cancel move failed:', e);
    }
  }

  // --- Input handlers (from renderer callbacks) ---

  /**
   * Direct click on a unit mesh. Mirrors the legacy `UiStore.onClickUnit` semantics:
   * - Nothing/non-unit selected, or selection belongs to a different player → replace with [unitId]
   * - Same player, unit not in selection → add (multi-select)
   * - Same player, unit already in selection → remove (toggle off)
   *
   * Selection is exclusive: a unit selection clears any selected territory.
   * The host territory is used internally as a render anchor for highlighting
   * destinations / connecting grass (see syncSelectionOverlays), but is not
   * stored as `selectedTerritoryId`.
   *
   * During non-planning phases, units may still be clicked for inspection.
   */
  private handleUnitClick(unitId: ID): void {
    const { map, selectedUnitIds, turnPhase } = this.store.getState();
    const unit = map.unit(unitId);
    if (!unit) return;

    if (turnPhase !== 'planning') {
      // Inspection only — single-select
      this.store.setState({
        selectedUnitIds: [unitId],
        selectedTerritoryId: null,
      });
      return;
    }

    let nextSelection: ID[];

    if (selectedUnitIds.length === 0) {
      nextSelection = [unitId];
    } else {
      const firstSelected = map.unit(selectedUnitIds[0]);
      const sameOwner = firstSelected != null && firstSelected.data.playerId === unit.data.playerId;
      if (!sameOwner) {
        nextSelection = [unitId];
      } else if (selectedUnitIds.includes(unitId)) {
        nextSelection = selectedUnitIds.filter((id) => id !== unitId);
      } else {
        nextSelection = [...selectedUnitIds, unitId];
      }
    }

    this.store.setState({
      selectedUnitIds: nextSelection,
      selectedTerritoryId: null,
    });
  }

  private handleTerritoryClick(territoryId: ID): void {
    const { map, selectedUnitIds, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') {
      // During replay, just select for viewing
      this.store.setState({ selectedTerritoryId: territoryId, selectedUnitIds: [] });
      return;
    }

    if (selectedUnitIds.length > 0) {
      // Units are selected — try to move them to clicked territory
      const validDestinations = getValidDestinations(map, selectedUnitIds);
      if (validDestinations.includes(territoryId)) {
        this.moveSelectedUnits(territoryId);
        return;
      }
    }

    // Plain territory click: select the territory and clear any unit selection.
    // Unit selection is driven by direct unit-mesh clicks (handleUnitClick).
    const territory = map.territory(territoryId);
    if (!territory) return;

    this.store.setState({
      selectedTerritoryId: territoryId,
      selectedUnitIds: [],
    });
  }

  private moveSelectedUnits(destinationId: ID): void {
    const { map, selectedUnitIds } = this.store.getState();

    try {
      map.applyAction({ type: 'move-units', unitIds: selectedUnitIds, destinationId });
      this.store.setState({ map, selectedUnitIds: [], selectedTerritoryId: null });
    } catch (e) {
      console.warn('[GameOrchestrator] Move failed:', e);
    }
  }

  // --- Resolution replay ---

  private async onAllPlayersReady(): Promise<void> {
    const { game } = this.store.getState();

    // Clone the current map (which has all pending actions) and resolve
    const mapData = Utils.clone(game.latestMap);
    const resolveMap = new GameMap(mapData);

    this.store.setState({ turnPhase: 'replaying' });
    await this.startResolution(resolveMap);
  }

  private async startResolution(map?: GameMap): Promise<void> {
    const resolveMap = map ?? new GameMap(Utils.clone(this.store.getState().map.data));

    this.abortController = new AbortController();
    this.store.setState({ turnPhase: 'replaying', map: resolveMap });

    const generator = resolveTurn(resolveMap);

    await this.resolutionRunner.run(
      generator,
      () => this.waitForAdvance(),
      this.abortController.signal,
    );

    if (this.abortController?.signal.aborted) return;
    this.abortController = null;

    // Post-resolution: check victory, advance turn
    this.onResolutionComplete(resolveMap);
  }

  private onResolutionComplete(resolvedMap: GameMap): void {
    const { game } = this.store.getState();

    // Push resolved map as new turn
    game.data.maps.push(resolvedMap.data);

    // Check for winners
    const winners = new GameMap(resolvedMap.data).winningPlayers(
      game.data.maxVictoryPoints,
      game.turn > game.data.maxTurns
    );

    if (winners.length > 0) {
      this.store.setState({ game, turnPhase: 'victory' });
      return;
    }

    // Advance to next turn — first player starts planning
    const nextMap = new GameMap(game.latestMap);
    this.store.setState({
      game,
      map: nextMap,
      turn: game.turn,
      turnPhase: 'planning',
      currentPlayerId: nextMap.playerIds[0],
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
    });

  }

  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      this.advanceResolve = resolve;
    });
  }

}
