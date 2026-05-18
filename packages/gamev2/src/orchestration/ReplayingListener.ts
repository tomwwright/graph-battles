import { GameMap, Resolution, resolveTurn } from '@battles/models';
import type { Game, ID } from '@battles/models';
import type {
  AnimationToken,
  Phase,
  StateDispatcher,
  Subscribable,
  VisibilityMode,
} from '../state/types';
import { selectCurrentPlayerId, selectNoRunningAnimations } from '../state/selectors';
import { isLocationVisible, isUnitVisible } from './Utils';

/** Minimal `StoreState` shape this listener reads. */
type ReplayingListenerState = {
  phase: Phase;
  map: GameMap;
  game: Game;
  userId?: ID;
  visibilityMode: VisibilityMode;
  pendingAnimations: AnimationToken[];
};

/**
 * Self-subscribing listener for the 'replaying' phase. Owns the entire
 * lifecycle: subscribes on the store, drives the `resolveTurn` generator
 * inline, gates each step on a user-issued advance, awaits idle animations,
 * and aborts cleanly on exit.
 *
 * Lifecycle state (`AbortController`, step-gate resolver) lives on this
 * instance. Every replay completion dispatches `replay/completed`; the reducer
 * advances `state.turn` by one. If the next turn is still in history the
 * phase stays `replaying` with a fresh map snapshot (this listener restarts
 * the generator); if the next turn is the current turn, the reducer
 * transitions to `next-player` or `victory`.
 *
 * Replay-session identity is tracked via the map reference. When the phase
 * stays `replaying` but `state.map` changes (e.g. user scrubs to a different
 * past turn mid-replay), the listener aborts the in-flight generator and
 * starts a new one. The reducer constructs a new `GameMap` for each turn
 * transition, so reference inequality is a reliable session boundary signal.
 *
 * Surface:
 * - `advance(action)` — resolves the in-flight step gate. Wired into
 *   `HandlerContext.advanceResolution` so `resolve-next` / `skip-resolution`
 *   commands flow here.
 *
 * Cross-listener ordering: `WaitForTurnResolutionListener` and this listener
 * observe disjoint phase types (`waiting` vs `replaying`), so the order their
 * subscribers fire on a transition is irrelevant.
 */
export class ReplayingListener {
  private lastPhaseType: Phase['type'];
  private lastReplayingMap: GameMap | null = null;
  private currentAbort: AbortController | null = null;
  private pending: ((v: 'next' | 'skip') => void) | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly source: Subscribable<ReplayingListenerState>,
    private readonly dispatcher: StateDispatcher,
  ) {
    this.lastPhaseType = source.getState().phase.type;
    this.unsubscribe = source.subscribe(() => this.onChange());
  }

  dispose(): void {
    this.unsubscribe();
    this.currentAbort?.abort();
    this.currentAbort = null;
  }

  /**
   * Resolve the in-flight step gate. Called by the `advanceResolution` handler
   * via `HandlerContext.advanceResolution`. No-op when no step is pending.
   */
  advance(action: 'next' | 'skip'): void {
    const fn = this.pending;
    this.pending = null;
    fn?.(action);
  }

  private onChange(): void {
    const state = this.source.getState();
    const nextPhase = state.phase;
    const prevType = this.lastPhaseType;

    // Exit replaying
    if (prevType === 'replaying' && nextPhase.type !== 'replaying') {
      this.abortCurrent();
      this.lastReplayingMap = null;
      this.lastPhaseType = nextPhase.type;
      return;
    }

    // Enter replaying
    if (prevType !== 'replaying' && nextPhase.type === 'replaying') {
      this.lastPhaseType = nextPhase.type;
      this.lastReplayingMap = state.map;
      this.startReplay(state.map);
      return;
    }

    // Replaying → replaying. Same type, but may be a new session: a new
    // `turn/set`, `turn/resolved`, or `replay/completed` (advancing to next
    // past turn) replaces `state.map`. Reference inequality identifies the
    // new session; in-place mutations during generator iteration preserve
    // the reference.
    if (prevType === 'replaying' && nextPhase.type === 'replaying') {
      if (state.map !== this.lastReplayingMap) {
        this.abortCurrent();
        this.lastReplayingMap = state.map;
        this.startReplay(state.map);
      }
      this.lastPhaseType = nextPhase.type;
      return;
    }

    this.lastPhaseType = nextPhase.type;
  }

  private startReplay(map: GameMap): void {
    this.currentAbort = new AbortController();
    const signal = this.currentAbort.signal;
    const generator = resolveTurn(map);
    void this.driveGenerator(generator, signal).finally(() => {
      if (signal.aborted) return;
      this.dispatcher.dispatch({ type: 'replay/completed' });
    });
  }

  private abortCurrent(): void {
    this.currentAbort?.abort();
    this.currentAbort = null;
    this.pending = null;
  }

  /**
   * Generator loop. Each iteration:
   *
   * 1. Publish next resolution via `resolution/set` so syncers can kick off
   *    pre-step work (camera focus).
   * 2. Wait for those animations to finish.
   * 3. Wait for user advance (or skip).
   * 4. Advance generator (applies mutation in place).
   * 5. Dispatch `map/mutated`. Syncers diff, animate the matching change, and
   *    register their work via `trackAnimation`.
   * 6. Wait until `pendingAnimations` is idle, then loop.
   *
   * Order: `resolution/set` must dispatch BEFORE `map/mutated` so the syncer
   * reading the new map sees the resolution context. Skip flushes
   * `resolution/set: null` first so syncers snap the drained state instead of
   * animating from a stale resolution frame.
   */
  private async driveGenerator(
    generator: Generator<Resolution>,
    signal: AbortSignal,
  ): Promise<void> {
    let result = generator.next();

    while (!result.done) {
      if (signal.aborted) return;

      const resolution = result.value;

      if (!this.isResolutionVisible(resolution)) {
        result = generator.next();
        continue;
      }

      this.dispatcher.dispatch({ type: 'resolution/set', resolution });
      await this.waitForNoRunningAnimations(signal);
      if (signal.aborted) return;

      const action = await this.waitForAdvance();
      if (signal.aborted) return;

      if (action === 'skip') {
        while (!result.done) {
          result = generator.next();
        }
        this.dispatcher.dispatch({ type: 'resolution/set', resolution: null });
        this.dispatcher.dispatch({ type: 'map/mutated' });
        return;
      }

      result = generator.next();
      this.dispatcher.dispatch({ type: 'map/mutated' });
      await this.waitForNoRunningAnimations(signal);
    }
  }

  private isResolutionVisible(resolution: Resolution): boolean {
    const state = this.source.getState();
    if (state.visibilityMode === 'all') return true;
    const currentPlayerId = selectCurrentPlayerId(state);
    if (!currentPlayerId) return true;
    const { map } = state;

    switch (resolution.phase) {
      case 'move':
      case 'add-defend':
        return isUnitVisible(map, currentPlayerId, resolution.unitId);
      case 'combat':
        return isLocationVisible(map, currentPlayerId, resolution.locationId);
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return isLocationVisible(map, currentPlayerId, resolution.territoryId);
      case 'gold':
        return true;
    }
  }

  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      this.pending = resolve;
    });
  }

  private waitForNoRunningAnimations(signal: AbortSignal): Promise<void> {
    if (selectNoRunningAnimations(this.source.getState())) return Promise.resolve();
    return new Promise((resolve) => {
      const unsub = this.source.subscribe(() => {
        if (signal.aborted || selectNoRunningAnimations(this.source.getState())) {
          unsub();
          resolve();
        }
      });
    });
  }

}
