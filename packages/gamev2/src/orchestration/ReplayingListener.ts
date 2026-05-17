import { Game, GameMap, resolveTurn, Utils } from '@battles/models';
import type { ID } from '@battles/models';
import type { GameStore } from '../state/GameStore';
import type { Phase, Subscribable } from '../state/types';
import {
  resolvePlayablePlayerIds,
  selectResolvedCurrentPlayerId,
} from '../state/selectors';
import type { ResolutionRunner } from './ResolutionRunner';

/** Minimal `StoreState` shape this listener reads. */
type ReplayingListenerState = { phase: Phase; map: GameMap; game: Game; userId?: ID };

/**
 * Self-subscribing listener for the 'replaying' phase.
 *
 * On enter: builds the `resolveTurn` generator and drives it through the
 * `ResolutionRunner`. On exit: aborts the in-flight replay via
 * `phase.abort.abort()`. Also owns `runReplayAndAdvance`, the post-resolution
 * glue invoked by `WaitForTurnResolutionListener` callbacks.
 *
 * Subscribes itself to the store in the constructor and tracks `lastPhase`
 * to detect entry/exit transitions. The previous `PhaseChangeListeners`
 * abstraction is no longer needed — listeners observe their own slice of
 * the phase state machine.
 *
 * Cross-listener ordering note: `WaitForTurnResolutionListener` and this
 * listener observe disjoint phase types (`waiting` vs `replaying`), so the
 * order their subscribers fire on a transition is irrelevant.
 */
export class ReplayingListener {
  private lastPhase: Phase;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly source: Subscribable<ReplayingListenerState>,
    private readonly store: GameStore,
    private readonly resolutionRunner: ResolutionRunner,
    private readonly userId: ID | undefined,
  ) {
    this.lastPhase = source.getState().phase;
    this.unsubscribe = source.subscribe(() => this.onChange());
  }

  dispose(): void {
    this.unsubscribe();
    if (this.lastPhase.type === 'replaying') {
      this.lastPhase.abort.abort();
    }
  }

  /**
   * Post-resolution flow. Dispatches the `replay/started-post-resolution`
   * action; this listener's `onChange` then observes the phase transition and
   * starts the replay via `enterReplaying`.
   */
  runReplayAndAdvance(resolved: Game, priorTurn: number): void {
    const preResolveMap = new GameMap(Utils.clone(resolved.data.maps[priorTurn - 1]));
    const state = this.source.getState();
    const carriedPlayerId = selectResolvedCurrentPlayerId(state);

    this.store.dispatch({
      type: 'replay/started-post-resolution',
      map: preResolveMap,
      currentPlayerId: carriedPlayerId,
      onComplete: (aborted) => this.afterPostResolutionReplay(aborted, resolved),
    });
  }

  private onChange(): void {
    const next = this.source.getState().phase;
    const prev = this.lastPhase;
    if (prev.type === next.type) return;
    this.lastPhase = next;
    if (prev.type === 'replaying') {
      prev.abort.abort();
    }
    if (next.type === 'replaying') {
      this.enterReplaying(next);
    }
  }

  private enterReplaying(phase: Extract<Phase, { type: 'replaying' }>): void {
    const generator = resolveTurn(this.source.getState().map);
    void this.resolutionRunner
      .run(generator, () => this.waitForAdvance(), phase.abort.signal)
      .then(() => {
        phase.onComplete?.(phase.abort.signal.aborted);
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
   *
   * `phase.advance` still lives on the phase variant in phases 1-7 of the
   * refactor. Phase 8 lifts the resolver onto this listener instance and
   * simplifies this method away.
   */
  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      const phase = this.source.getState().phase;
      if (phase.type !== 'replaying') {
        resolve('skip');
        return;
      }
      this.store.dispatch({ type: 'phase/set', phase: { ...phase, advance: resolve } });
    });
  }
}
