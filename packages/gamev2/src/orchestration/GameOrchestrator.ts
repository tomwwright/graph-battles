import { ID, GameMap } from '@battles/models';
import type { Actions } from '@battles/models';
import { GameStore } from '../state/GameStore';
import type { Command, Dispatch, Phase } from '../state/types';
import {
  currentPlayerIdFromPhase,
  resolvePlayablePlayerIds,
  selectPlayablePlayerIds,
} from '../state/selectors';
import { GameRenderer } from '../rendering/GameRenderer';
import { ResolutionRunner } from './ResolutionRunner';
import { UnitMeshSyncer } from './UnitMeshSyncer';
import { OverlaySyncer } from './OverlaySyncer';
import { GameProvider } from '../providers/GameProvider';
import type { RenderMap } from '../map/MapParser';
import type { HandlerContext } from './HandlerContext';
import { PhaseChangeListeners } from './PhaseChangeListeners';
import { WaitForTurnResolutionListener } from './WaitForTurnResolutionListener';
import { ReplayingListener } from './ReplayingListener';
import {
  onClickUnit,
  onClickTerritory,
  onTerritoryAction,
  onCancelMove,
  onConfirmNextPlayer,
  onReadyPlayer,
  onSetTurn,
  onAdvanceResolution,
} from './handlers';

/**
 * Central coordinator. Thin: builds dependencies, owns lifecycle, routes
 * commands to handlers, and exposes a small service interface (`HandlerContext`)
 * that handlers call back into.
 *
 * Phase-bound side effects live in `WaitForTurnResolutionListener` and
 * `ReplayingListener`, wired into `PhaseEffects` here.
 *
 * Per-phase data (advance callback, abort controller, current player) lives
 * on the `Phase` discriminated union in the store, not on this instance.
 */
export class GameOrchestrator {
  readonly store: GameStore;
  private renderer: GameRenderer;
  private resolutionRunner: ResolutionRunner;
  private unitMeshSyncer: UnitMeshSyncer | null = null;
  private overlaySyncer: OverlaySyncer | null = null;
  private provider: GameProvider;
  private renderMap: RenderMap | null = null;
  private readonly userId: ID | undefined;
  private readonly phaseEffects: PhaseChangeListeners;
  private readonly waitListener: WaitForTurnResolutionListener;
  private readonly replayingListener: ReplayingListener;

  /** Bound dispatch — pass into React context. */
  readonly dispatch: Dispatch = (cmd) => this.handle(cmd);

  /** Service interface exposed to handlers. Methods are bound below in the constructor. */
  private readonly ctx: HandlerContext;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider, userId?: ID) {
    this.store = store;
    this.renderer = renderer;
    this.resolutionRunner = new ResolutionRunner(store, renderer);
    this.provider = provider;
    this.userId = userId;
    this.ctx = {
      store: this.store,
      applyAction: (action) => this.applyAction(action),
    };

    this.replayingListener = new ReplayingListener(
      this.store,
      this.resolutionRunner,
      this.userId,
    );
    this.waitListener = new WaitForTurnResolutionListener(this.provider, {
      onResolved: (resolved, priorTurn) =>
        this.replayingListener.runReplayAndAdvance(resolved, priorTurn),
      onError: (e) => this.handleWaitForTurnError(e),
    });

    // Phase entry/exit side effects. Wired before initialise()'s setState so
    // the placeholder→real phase transition fires the appropriate entry hook.
    this.phaseEffects = new PhaseChangeListeners(this.store)
      .onEnter('waiting', (s) => this.waitListener.start(s.turn))
      .onExit('waiting', () => this.waitListener.cancel())
      .onEnter('replaying', (s) => this.replayingListener.start(s))
      .onExit('replaying', (phase) => this.replayingListener.cancel(phase));
  }

  async initialise(renderMap: RenderMap): Promise<void> {
    this.renderMap = renderMap;

    const game = await this.provider.get();
    const map = new GameMap(game.latestMap);
    const playablePlayerIds = resolvePlayablePlayerIds(game, this.userId, map);

    const notReady = playablePlayerIds.filter((id) => {
      const player = map.player(id);
      return player != null && !player.ready;
    });
    const allReady = notReady.length === 0;
    const startingPlayerId = notReady[0] ?? playablePlayerIds[0] ?? map.playerIds[0];

    const initialPhase: Phase =
      allReady && playablePlayerIds.length > 0
        ? { type: 'waiting', submittedAtTurn: game.turn }
        : { type: 'next-player', currentPlayerId: startingPlayerId };

    this.store.setState({
      game,
      map,
      mapRevision: 0,
      turn: game.turn,
      phase: initialPhase,
      userId: this.userId,
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hover: null,
      currentResolution: null,
      visibilityMode: 'all',
    });

    await this.renderer.initialise(renderMap, map);

    this.renderer.onTerritoryClick((territoryId) =>
      this.dispatch({ type: 'click-territory', territoryId }),
    );
    this.renderer.onUnitClick((unitId) => this.dispatch({ type: 'click-unit', unitId }));
    this.renderer.onHover((hover) => this.store.setState({ hover }));

    this.unitMeshSyncer = new UnitMeshSyncer(this.store, this.renderer.getUnitRenderer());
    this.overlaySyncer = new OverlaySyncer(this.store, this.renderer);
  }

  dispose(): void {
    this.unitMeshSyncer?.dispose();
    this.overlaySyncer?.dispose();
    this.phaseEffects.dispose();
  }

  // --- Command routing ---

  private handle(cmd: Command): void {
    switch (cmd.type) {
      case 'click-unit':
        return onClickUnit(this.ctx, cmd);
      case 'click-territory':
        return onClickTerritory(this.ctx, cmd);
      case 'territory-action':
        return onTerritoryAction(this.ctx, cmd);
      case 'cancel-move':
        return onCancelMove(this.ctx, cmd);
      case 'confirm-next-player':
        return onConfirmNextPlayer(this.ctx);
      case 'ready-player':
        return onReadyPlayer(this.ctx);
      case 'set-turn':
        return onSetTurn(this.ctx, cmd);
      case 'resolve-next':
      case 'skip-resolution':
        return onAdvanceResolution(this.ctx, cmd);
    }
  }

  // --- Services exposed to handlers via ctx ---

  private applyAction(action: Actions.ModelAction): void {
    const { map, phase } = this.store.getState();
    try {
      map.applyAction(action);
      this.store.setState({ map });
      const playerId = currentPlayerIdFromPhase(phase);
      if (playerId) {
        this.provider.action(playerId, action).catch((e) => {
          console.warn('[GameOrchestrator] provider.action failed:', e);
        });
      }
    } catch (e) {
      console.warn('[GameOrchestrator] apply failed:', action, e);
    }
  }

  /**
   * Fallback path when polling fails for a non-abort reason. Drops to planning
   * so the user can retry.
   */
  private handleWaitForTurnError(e: unknown): void {
    console.warn('[GameOrchestrator] waitForTurn failed:', e);
    const state = this.store.getState();
    if (state.phase.type !== 'waiting') return;
    this.store.setState({
      phase: {
        type: 'planning',
        currentPlayerId:
          selectPlayablePlayerIds(state)[0] ?? state.map.playerIds[0],
      },
    });
  }
}
