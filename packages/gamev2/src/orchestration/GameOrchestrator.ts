import { ID, GameMap } from '@battles/models';
import type { Actions } from '@battles/models';
import { GameStore } from '../state/GameStore';
import type { Command, Dispatch, Phase } from '../state/types';
import { currentPlayerIdFromPhase, resolvePlayablePlayerIds } from '../state/selectors';
import { GameRenderer } from '../rendering/GameRenderer';
import { UnitSyncer } from './UnitSyncer';
import { TerritorySyncer } from './TerritorySyncer';
import { CameraSyncer } from './CameraSyncer';
import { GameProvider } from '../providers/GameProvider';
import type { RenderMap } from '../map/MapParser';
import type { HandlerContext } from './HandlerContext';
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
 * Phase-bound side effects are owned by self-subscribing listeners
 * (`WaitForTurnResolutionListener`, `ReplayingListener`) — each watches its
 * own slice of the phase state machine and fires its own enter/exit.
 *
 * Per-phase data (advance callback, abort controller, current player) lives
 * on the `Phase` discriminated union in the store, not on this instance.
 */
export class GameOrchestrator {
  readonly store: GameStore;
  private renderer: GameRenderer;
  private unitSyncer: UnitSyncer | null = null;
  private territorySyncer: TerritorySyncer | null = null;
  private cameraSyncer: CameraSyncer | null = null;
  private provider: GameProvider;
  private renderMap: RenderMap | null = null;
  private readonly userId: ID | undefined;
  private readonly waitListener: WaitForTurnResolutionListener;
  private readonly replayingListener: ReplayingListener;

  /** Bound dispatch — pass into React context. */
  readonly dispatch: Dispatch = (cmd) => this.handle(cmd);

  /** Service interface exposed to handlers. Methods are bound below in the constructor. */
  private readonly ctx: HandlerContext;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider, userId?: ID) {
    this.store = store;
    this.renderer = renderer;
    this.provider = provider;
    this.userId = userId;

    // Self-subscribing listeners. Construct before `initialise()` dispatches
    // the real initial phase so the placeholder→real transition fires the
    // appropriate entry hook automatically.
    this.replayingListener = new ReplayingListener(this.store, this.store);
    this.waitListener = new WaitForTurnResolutionListener(
      this.store,
      this.store,
      this.provider,
    );

    this.ctx = {
      getState: () => this.store.getState(),
      dispatch: (action) => this.store.dispatch(action),
      applyAction: (action) => this.applyAction(action),
      advanceResolution: (action) => this.replayingListener.advance(action),
    };
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

    this.store.dispatch({
      type: 'init',
      state: {
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
        autoResolve: false,
        visibilityMode: 'all',
        pendingAnimations: [],
      },
    });

    await this.renderer.initialise(renderMap, map);

    this.renderer.onTerritoryClick((territoryId) =>
      this.dispatch({ type: 'click-territory', territoryId }),
    );
    this.renderer.onUnitClick((unitId) => this.dispatch({ type: 'click-unit', unitId }));
    this.renderer.onHover((hover) => this.store.dispatch({ type: 'hover/set', hover }));

    this.unitSyncer = new UnitSyncer(this.store, this.store, this.renderer.getUnitRenderer());
    this.territorySyncer = new TerritorySyncer(this.store, this.renderer);
    this.cameraSyncer = new CameraSyncer(this.store, this.store, this.renderer);
  }

  dispose(): void {
    this.unitSyncer?.dispose();
    this.territorySyncer?.dispose();
    this.cameraSyncer?.dispose();
    this.waitListener.dispose();
    this.replayingListener.dispose();
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
      this.store.dispatch({ type: 'map/mutated' });
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
}
