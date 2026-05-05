import { ID, Values, Game, GameMap, resolveTurn, Utils } from '@battles/models';
import type { Actions } from '@battles/models';
import { GameStore } from '../state/GameStore';
import type { StoreState, UserActionDispatch } from '../state/types';
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
  private readonly userId: ID | undefined;
  private playablePlayerIds: ID[] = [];

  // Resolution control
  private advanceResolve: ((value: 'next' | 'skip') => void) | null = null;
  private abortController: AbortController | null = null;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider, userId?: ID) {
    this.store = store;
    this.renderer = renderer;
    this.resolutionRunner = new ResolutionRunner(store, renderer);
    this.provider = provider;
    this.userId = userId;
  }

  /**
   * Initialise the orchestrator: load game from provider, set up renderer,
   * register input callbacks.
   */
  async initialise(renderMap: RenderMap): Promise<void> {
    this.renderMap = renderMap;

    const game = await this.provider.get();
    const map = new GameMap(game.latestMap);

    this.playablePlayerIds = this.resolvePlayablePlayerIds(game, map);

    this.store.setState({
      game,
      map,
      mapRevision: 0,
      currentPlayerId: this.playablePlayerIds[0] ?? map.playerIds[0],
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
  }

  /**
   * Apply an action to the current map, push to the provider, and merge any
   * additional state updates (e.g. clearing selection) into the store. Errors
   * during `map.applyAction` are caught and logged so a thrown action does not
   * leave half-applied store state.
   */
  private apply(action: Actions.ModelAction, stateUpdate: Partial<StoreState> = {}): void {
    const { map } = this.store.getState();
    try {
      map.applyAction(action);
      this.store.setState({ map, ...stateUpdate });
      this.provider.action(action).catch((e) => {
        console.warn('[GameOrchestrator] provider.action failed:', e);
      });
    } catch (e) {
      console.warn('[GameOrchestrator] apply failed:', action, e);
    }
  }

  /**
   * Players this tab is allowed to control. For remote play with a userId,
   * limit to that user's players (mirrors v1 setFilteredUserIds). Otherwise
   * all players (hot-seat / stub).
   */
  private resolvePlayablePlayerIds(
    game: { users: { data: { id: ID }; players: { data: { id: ID } }[] }[] },
    map: GameMap,
  ): ID[] {
    if (!this.userId) return map.playerIds;
    const user = game.users.find((u) => u.data.id === this.userId);
    if (!user) return map.playerIds;
    return user.players.map((p) => p.data.id);
  }

  // --- UserActionDispatch implementation ---

  onReadyPlayer(): void {
    const { currentPlayerId, turnPhase, turn } = this.store.getState();
    if (turnPhase !== 'planning') return;

    const cycle = this.playablePlayerIds;
    const currentIdx = cycle.indexOf(currentPlayerId);
    const isLast = currentIdx >= cycle.length - 1;

    this.apply(
      { type: 'ready-player', playerId: currentPlayerId, isReady: true },
      isLast
        ? { turnPhase: 'waiting' }
        : {
            turnPhase: 'next-player',
            currentPlayerId: cycle[currentIdx + 1],
            selectedUnitIds: [],
            selectedTerritoryId: null,
          },
    );

    if (isLast) {
      // Local: provider.action() above already advanced persisted turn.
      // Remote: action() sent to API; provider.waitForTurn polls until server resolves.
      this.provider
        .waitForTurn(turn)
        .then((resolved) => this.runReplayAndAdvance(resolved, turn))
        .catch((e) => {
          console.warn('[GameOrchestrator] waitForTurn failed:', e);
          this.store.setState({ turnPhase: 'planning' });
        });
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
      void this.runReplay(map);
    }
  }

  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void {
    if (this.store.getState().turnPhase !== 'planning') return;
    this.apply({ type: 'territory', territoryId, action });
  }

  onCancelTerritoryAction(territoryId: ID): void {
    if (this.store.getState().turnPhase !== 'planning') return;
    // Passing a null action refunds and removes the pending action
    // (see packages/models/src/actions/territory.ts).
    this.apply({ type: 'territory', territoryId, action: null as any });
  }

  onConfirmNextPlayer(): void {
    const { turnPhase } = this.store.getState();
    if (turnPhase !== 'next-player') return;
    this.store.setState({ turnPhase: 'planning' });
  }

  onCancelMove(unitIds: ID[]): void {
    if (this.store.getState().turnPhase !== 'planning') return;
    this.apply(
      { type: 'move-units', unitIds, destinationId: null as any },
      { selectedUnitIds: [] },
    );
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
    const { selectedUnitIds } = this.store.getState();
    this.apply(
      { type: 'move-units', unitIds: selectedUnitIds, destinationId },
      { selectedUnitIds: [], selectedTerritoryId: null },
    );
  }

  // --- Resolution replay ---

  /**
   * Runs the replay animation against `map` (the pre-resolve snapshot with all
   * pending actions baked in). Returns false if aborted.
   */
  private async runReplay(map: GameMap): Promise<boolean> {
    this.abortController = new AbortController();
    this.store.setState({ map, turnPhase: 'replaying' });

    const generator = resolveTurn(map);
    await this.resolutionRunner.run(
      generator,
      () => this.waitForAdvance(),
      this.abortController.signal,
    );

    const aborted = this.abortController.signal.aborted;
    this.abortController = null;
    return !aborted;
  }

  /**
   * Replay the just-resolved turn (animation against the pre-resolve map at
   * `priorTurn`), then advance store state to point at the authoritative
   * resolved Game returned by the provider.
   */
  private async runReplayAndAdvance(resolved: Game, priorTurn: number): Promise<void> {
    // The pre-resolve snapshot is at maps[priorTurn - 1] — the server (or local
    // resolver) has all pending actions applied to it before resolveTurn() ran.
    const preResolveMap = new GameMap(Utils.clone(resolved.data.maps[priorTurn - 1]));
    const completed = await this.runReplay(preResolveMap);
    if (!completed) return;

    const nextMap = new GameMap(resolved.latestMap);
    this.playablePlayerIds = this.resolvePlayablePlayerIds(resolved, nextMap);

    const winners = nextMap.winningPlayers(
      resolved.data.maxVictoryPoints,
      resolved.turn > resolved.data.maxTurns,
    );
    if (winners.length > 0) {
      this.store.setState({
        game: resolved,
        map: nextMap,
        turn: resolved.turn,
        turnPhase: 'victory',
      });
      return;
    }

    this.store.setState({
      game: resolved,
      map: nextMap,
      turn: resolved.turn,
      turnPhase: 'next-player',
      currentPlayerId: this.playablePlayerIds[0] ?? nextMap.playerIds[0],
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
