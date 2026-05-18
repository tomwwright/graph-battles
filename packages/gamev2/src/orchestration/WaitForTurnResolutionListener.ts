import type { GameProvider } from '../providers/GameProvider';
import type { Phase, StateDispatcher, Subscribable } from '../state/types';

/** Minimal `StoreState` shape this listener reads. */
type WaitForTurnResolutionListenerState = { phase: Phase; turn: number };

/**
 * Self-subscribing listener for the 'waiting' phase.
 *
 * On enter: kicks `provider.waitForTurn` and dispatches `turn/resolved` when
 * the poll resolves. On exit: aborts the in-flight poll via the internal
 * `AbortController` — the rejected promise's `AbortError` is swallowed
 * silently. On non-abort failure, dispatches `wait-for-turn/failed` so the
 * reducer can drop back to `planning`.
 *
 * Subscribes itself to the store in the constructor and tracks `lastPhase`
 * to detect entry/exit transitions.
 */
export class WaitForTurnResolutionListener {
  private pollAbort: AbortController | null = null;
  private lastPhase: Phase;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly source: Subscribable<WaitForTurnResolutionListenerState>,
    private readonly dispatcher: StateDispatcher,
    private readonly provider: GameProvider,
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
        this.dispatcher.dispatch({ type: 'turn/resolved', resolved });
      })
      .catch((e) => {
        if ((e as { name?: string })?.name === 'AbortError' || signal.aborted) return;
        console.warn('[WaitForTurnResolutionListener] waitForTurn failed:', e);
        this.dispatcher.dispatch({ type: 'wait-for-turn/failed' });
      });
  }

  private cancel(): void {
    this.pollAbort?.abort();
    this.pollAbort = null;
  }
}
