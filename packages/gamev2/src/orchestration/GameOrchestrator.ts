import { ID, Values, GameMap, resolveTurn, Utils } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { UserActionDispatch } from '../state/types';
import { GameRenderer } from '../rendering/GameRenderer';
import { ResolutionRunner } from './ResolutionRunner';
import { UnitMeshSyncer } from './UnitMeshSyncer';
import { OverlaySyncer } from './OverlaySyncer';
import { GameProvider } from '../providers/GameProvider';
import { APIGameProvider } from '../providers/APIGameProvider';
import type { RenderMap } from '../map/MapParser';
import { getValidDestinations } from './Utils';

const REMOTE_POLL_INTERVAL_MS = 10_000;

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
  private readonly userId: ID | undefined;
  private readonly isRemote: boolean;
  private playableplayerIds: ID[] = [];

  // Resolution control
  private advanceResolve: ((value: 'next' | 'skip') => void) | null = null;
  private abortController: AbortController | null = null;

  // Remote turn-resolution polling
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollCancelled = false;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider, userId?: ID) {
    this.store = store;
    this.renderer = renderer;
    this.resolutionRunner = new ResolutionRunner(store, renderer);
    this.provider = provider;
    this.userId = userId;
    this.isRemote = provider instanceof APIGameProvider;
  }

  /**
   * Initialise the orchestrator: load game from provider, set up renderer,
   * register input callbacks.
   */
  async initialise(renderMap: RenderMap): Promise<void> {
    this.renderMap = renderMap;

    const game = await this.provider.get();
    const map = new GameMap(game.latestMap);

    this.playableplayerIds = this.resolvePlayableplayerIds(game, map);

    this.store.setState({
      game,
      map,
      mapRevision: 0,
      currentPlayerId: this.playableplayerIds[0] ?? map.playerIds[0],
      turn: game.turn,
      turnPhase: 'next-player',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hover: null,
      currentResolution: null,
      visibilityMode: 'all',
      userId: this.userId,
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
    this.cancelPoll();
  }

  /**
   * Players this tab is allowed to control. For remote play with a userId,
   * limit to that user's players (mirrors v1 setFilteredUserIds). Otherwise
   * all players (hot-seat / stub).
   */
  private resolvePlayableplayerIds(game: { users: { data: { id: ID }; players: { data: { id: ID } }[] }[] }, map: GameMap): ID[] {
    if (!this.userId) return map.playerIds;
    const user = game.users.find((u) => u.data.id === this.userId);
    if (!user) return map.playerIds;
    return user.players.map((p) => p.data.id);
  }

  // --- UserActionDispatch implementation ---

  onReadyPlayer(): void {
    const { map, currentPlayerId, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    const action = { type: 'ready-player', playerId: currentPlayerId, isReady: true } as const;
    map.applyAction(action);
    this.store.setState({ map });
    this.dispatchToProvider(action);

    const cycle = this.playableplayerIds;
    const currentIdx = cycle.indexOf(currentPlayerId);

    if (currentIdx < cycle.length - 1) {
      const nextPlayerId = cycle[currentIdx + 1];
      this.store.setState({
        turnPhase: 'next-player',
        currentPlayerId: nextPlayerId,
        selectedUnitIds: [],
        selectedTerritoryId: null,
      });
    } else {
      this.onAllPlayersReady();
    }
  }

  /**
   * Fire-and-forget action push to the provider. Provider returns the locally-mutated
   * Game; we already mutated `map` in place, so the result is discarded. Errors
   * during the API push (only on `ready-player`) surface as console warnings —
   * action stays cached locally for retry on next `get()`.
   */
  private dispatchToProvider(action: import('@battles/models').Actions.ModelAction): void {
    this.provider.action(action).catch((e) => {
      console.warn('[GameOrchestrator] provider.action failed:', e);
    });
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

    const modelAction = { type: 'territory' as const, territoryId, action };
    try {
      map.applyAction(modelAction);
      this.store.setState({ map });
      this.dispatchToProvider(modelAction);
    } catch (e) {
      console.warn('[GameOrchestrator] Territory action failed:', e);
    }
  }

  onCancelTerritoryAction(territoryId: ID): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Passing a null action refunds and removes the pending action
    // (see packages/models/src/actions/territory.ts).
    const modelAction = { type: 'territory' as const, territoryId, action: null as any };
    try {
      map.applyAction(modelAction);
      this.store.setState({ map });
      this.dispatchToProvider(modelAction);
    } catch (e) {
      console.warn('[GameOrchestrator] Cancel territory action failed:', e);
    }
  }

  onConfirmNextPlayer(): void {
    const { turnPhase } = this.store.getState();
    if (turnPhase !== 'next-player') return;
    this.store.setState({ turnPhase: 'planning' });
  }

  onCancelMove(unitIds: ID[]): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    const modelAction = { type: 'move-units' as const, unitIds, destinationId: null as any };
    try {
      map.applyAction(modelAction);
      this.store.setState({ map, selectedUnitIds: [] });
      this.dispatchToProvider(modelAction);
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

    const modelAction = { type: 'move-units' as const, unitIds: selectedUnitIds, destinationId };
    try {
      map.applyAction(modelAction);
      this.store.setState({ map, selectedUnitIds: [], selectedTerritoryId: null });
      this.dispatchToProvider(modelAction);
    } catch (e) {
      console.warn('[GameOrchestrator] Move failed:', e);
    }
  }

  // --- Resolution replay ---

  private async onAllPlayersReady(): Promise<void> {
    if (this.isRemote) {
      // Remote: this user's players are ready. Server resolves once every user has submitted.
      // Wait for the next turn to appear via polling.
      this.store.setState({ turnPhase: 'waiting' });
      this.startPollingForResolvedTurn();
      return;
    }

    const { game } = this.store.getState();
    const mapData = Utils.clone(game.latestMap);
    const resolveMap = new GameMap(mapData);

    this.store.setState({ turnPhase: 'replaying' });
    await this.startResolution(resolveMap);
  }

  /**
   * Poll provider.get() until game.turn advances past the current turn — this
   * indicates the server has resolved a turn. Cancellable via cancelPoll().
   */
  private startPollingForResolvedTurn(): void {
    this.cancelPoll();
    this.pollCancelled = false;
    const startTurn = this.store.getState().turn;

    const tick = async (): Promise<void> => {
      if (this.pollCancelled) return;
      try {
        const game = await this.provider.get();
        if (this.pollCancelled) return;
        if (game.turn > startTurn) {
          const map = new GameMap(game.latestMap);
          this.playableplayerIds = this.resolvePlayableplayerIds(game, map);
          this.store.setState({
            game,
            map,
            turn: game.turn,
            turnPhase: 'next-player',
            currentPlayerId: this.playableplayerIds[0] ?? map.playerIds[0],
            selectedUnitIds: [],
            selectedTerritoryId: null,
            currentResolution: null,
          });
          return;
        }
      } catch (e) {
        console.warn('[GameOrchestrator] Poll failed:', e);
      }
      this.pollTimeout = setTimeout(tick, REMOTE_POLL_INTERVAL_MS);
    };

    tick();
  }

  private cancelPoll(): void {
    this.pollCancelled = true;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
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

    // Advance to next turn — first player gets "next player" popup
    const nextMap = new GameMap(game.latestMap);
    this.store.setState({
      game,
      map: nextMap,
      turn: game.turn,
      turnPhase: 'next-player',
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
