import type { Game } from '@battles/models';
import type { GameProvider } from '../providers/GameProvider';
import type { Phase, StoreState, Subscribable } from '../state/types';

export type WaitForTurnCallbacks = {
  /** Called when polling resolves with a new turn. */
  onResolved(resolved: Game, priorTurn: number): void;
  /**
   * Called when polling fails for a non-abort reason. The listener does not
   * touch phase state — the caller decides how to fall back (e.g. drop to
   * planning).
   */
  onError(error: unknown): void;
};

/**
 * Self-subscribing listener for the 'waiting' phase.
 *
 * On enter: kicks `provider.waitForTurn` and pipes the result into
 * `callbacks.onResolved`. On exit: aborts the in-flight poll via the
 * internal `AbortController` — the rejected promise's `AbortError` is
 * swallowed silently.
 *
 * Subscribes itself to the store in the constructor and tracks `lastPhase`
 * to detect entry/exit transitions. The previous `PhaseChangeListeners`
 * abstraction is no longer needed.
 */
export class WaitForTurnResolutionListener {
  private pollAbort: AbortController | null = null;
  private lastPhase: Phase;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly source: Subscribable<StoreState>,
    private readonly provider: GameProvider,
    private readonly callbacks: WaitForTurnCallbacks,
  ) {
    this.lastPhase = source.getState().phase;
    this.unsubscribe = source.subscribe(() => this.onChange());
  }

  dispose(): void {
    this.cancel();
    this.unsubscribe();
  }

  private onChange(): void {
    const next = this.source.getState().phase;
    const prev = this.lastPhase;
    if (prev.type === next.type) return;
    this.lastPhase = next;
    if (prev.type === 'waiting') this.cancel();
    if (next.type === 'waiting') this.start(this.source.getState().turn);
  }

  private start(turn: number): void {
    this.pollAbort = new AbortController();
    const signal = this.pollAbort.signal;
    this.provider
      .waitForTurn(turn, signal)
      .then((resolved) => {
        if (signal.aborted) return;
        this.callbacks.onResolved(resolved, turn);
      })
      .catch((e) => {
        if ((e as { name?: string })?.name === 'AbortError' || signal.aborted) return;
        this.callbacks.onError(e);
      });
  }

  private cancel(): void {
    this.pollAbort?.abort();
    this.pollAbort = null;
  }
}
