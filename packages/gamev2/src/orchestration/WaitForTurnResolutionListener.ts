import type { Game } from '@battles/models';
import type { GameProvider } from '../providers/GameProvider';

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
 * Owns the in-flight `provider.waitForTurn` poll for the 'waiting' phase.
 *
 * Wired to PhaseEffects in GameOrchestrator:
 *   .onEnter('waiting', s => waitListener.start(s.turn))
 *   .onExit('waiting', () => waitListener.cancel())
 *
 * `cancel()` aborts the poll via `AbortController`. The aborted poll rejects
 * with `AbortError`, which the listener swallows — `onError` only fires for
 * genuine failures.
 */
export class WaitForTurnResolutionListener {
  private pollAbort: AbortController | null = null;

  constructor(
    private readonly provider: GameProvider,
    private readonly callbacks: WaitForTurnCallbacks,
  ) {}

  start(turn: number): void {
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

  cancel(): void {
    this.pollAbort?.abort();
    this.pollAbort = null;
  }
}
