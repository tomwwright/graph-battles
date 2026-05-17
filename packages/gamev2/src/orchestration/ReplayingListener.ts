import { Game, GameMap, resolveTurn, Utils } from '@battles/models';
import type { ID } from '@battles/models';
import type { GameStore } from '../state/GameStore';
import type { Phase, StoreState } from '../state/types';
import {
  resolvePlayablePlayerIds,
  selectResolvedCurrentPlayerId,
} from '../state/selectors';
import type { ResolutionRunner } from './ResolutionRunner';

/**
 * Owns the lifecycle of the 'replaying' phase: start the resolveTurn() generator
 * on entry, abort it on exit, and provide the `waitForAdvance` callback the
 * `ResolutionRunner` awaits between steps.
 *
 * Also owns the post-resolution glue (`runReplayAndAdvance`) — building the
 * pre-resolve map, transitioning into 'replaying' with an `onComplete` that
 * advances state into 'next-player' or 'victory' once the replay finishes.
 *
 * Wired to PhaseEffects in GameOrchestrator:
 *   .onEnter('replaying', s => replayListener.start(s))
 *   .onExit('replaying', phase => replayListener.cancel(phase))
 */
export class ReplayingListener {
  constructor(
    private readonly store: GameStore,
    private readonly resolutionRunner: ResolutionRunner,
    private readonly userId: ID | undefined,
  ) {}

  /**
   * Entry hook for 'replaying'. Runs the generator against `state.map` (set by
   * whoever transitioned us in). On completion fires `phase.onComplete(aborted)`
   * if set.
   */
  start(state: StoreState): void {
    if (state.phase.type !== 'replaying') return;
    const phase = state.phase;
    const generator = resolveTurn(state.map);
    void this.resolutionRunner
      .run(generator, () => this.waitForAdvance(), phase.abort.signal)
      .then(() => {
        phase.onComplete?.(phase.abort.signal.aborted);
      });
  }

  /** Exit hook for 'replaying'. */
  cancel(phase: Extract<Phase, { type: 'replaying' }>): void {
    phase.abort.abort();
  }

  /**
   * Post-resolution flow. Sets up the 'replaying' phase against the pre-resolve
   * map and wires `onComplete` to advance state into next-player / victory.
   * The actual replay is started by the entry hook.
   */
  runReplayAndAdvance(resolved: Game, priorTurn: number): void {
    const preResolveMap = new GameMap(Utils.clone(resolved.data.maps[priorTurn - 1]));
    const state = this.store.getState();
    const carriedPlayerId = selectResolvedCurrentPlayerId(state);

    this.store.dispatch({
      type: 'replay/started-post-resolution',
      map: preResolveMap,
      currentPlayerId: carriedPlayerId,
      onComplete: (aborted) => this.afterPostResolutionReplay(aborted, resolved),
    });
  }

  private afterPostResolutionReplay(aborted: boolean, resolved: Game): void {
    if (aborted) return;
    const nextMap = new GameMap(resolved.latestMap);
    const playablePlayerIds = resolvePlayablePlayerIds(resolved, this.userId, nextMap);

    const winners = nextMap.winningPlayers(
      resolved.data.maxVictoryPoints,
      resolved.turn > resolved.data.maxTurns,
    );

    if (winners.length > 0) {
      this.store.dispatch({
        type: 'game/advanced-to-victory',
        game: resolved,
        map: nextMap,
        turn: resolved.turn,
      });
      return;
    }

    this.store.dispatch({
      type: 'game/advanced-to-next-player',
      game: resolved,
      map: nextMap,
      turn: resolved.turn,
      currentPlayerId: playablePlayerIds[0] ?? nextMap.playerIds[0],
    });
  }

  /**
   * Promise the ResolutionRunner awaits between steps. Stores the resolver on
   * the replaying phase so `resolve-next` / `skip-resolution` commands can
   * reach it via `phase.advance`.
   */
  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      const phase = this.store.getState().phase;
      if (phase.type !== 'replaying') {
        resolve('skip');
        return;
      }
      // `phase.advance` still lives on the phase variant in phases 1-7 of the
      // refactor. Phase 8 lifts the resolver onto this listener instance and
      // simplifies this method away.
      this.store.dispatch({ type: 'phase/set', phase: { ...phase, advance: resolve } });
    });
  }
}
