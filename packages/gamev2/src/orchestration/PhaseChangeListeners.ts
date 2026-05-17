import type { GameStore } from '../state/GameStore';
import type { Phase, PhaseType, StoreState } from '../state/types';

type EntryHandler = (state: StoreState) => void;
type ExitHandler<T extends PhaseType> = (
  exitingPhase: Extract<Phase, { type: T }>,
  nextState: StoreState,
) => void;

type AnyExitHandler = (exitingPhase: Phase, nextState: StoreState) => void;

/**
 * State-machine entry/exit hooks over `StoreState.phase`.
 *
 * Subscribes to the store, tracks the previous phase, and fires `onEnter` /
 * `onExit` handlers when `phase.type` changes. Same-type setState calls (e.g.
 * a replaying-phase update that swaps out `advance`) do NOT re-fire entry —
 * only true type transitions trigger handlers.
 *
 * Construct in the orchestrator constructor so the listener is wired before
 * the first real `setState` in `initialise()` — the placeholder phase set in
 * the provider becomes the previous phase, and the real initial phase fires
 * the appropriate entry hook.
 */
export class PhaseChangeListeners {
  private entry = new Map<PhaseType, EntryHandler>();
  private exit = new Map<PhaseType, AnyExitHandler>();
  private lastPhase: Phase;
  private readonly unsubscribe: () => void;

  constructor(private readonly store: GameStore) {
    this.lastPhase = store.getState().phase;
    this.unsubscribe = store.subscribe(() => this.onChange());
  }

  onEnter<T extends PhaseType>(type: T, handler: EntryHandler): this {
    this.entry.set(type, handler);
    return this;
  }

  onExit<T extends PhaseType>(type: T, handler: ExitHandler<T>): this {
    // Internal storage uses a widened signature; the public API keeps the
    // narrow per-variant type via the generic, so callers see correctly typed
    // `exitingPhase`. The cast is safe because `onChange` only invokes the
    // handler when `prev.type === T`.
    this.exit.set(type, handler as unknown as AnyExitHandler);
    return this;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private onChange(): void {
    const state = this.store.getState();
    const prev = this.lastPhase;
    const next = state.phase;
    if (prev.type === next.type) {
      this.lastPhase = next;
      return;
    }
    this.exit.get(prev.type)?.(prev, state);
    this.entry.get(next.type)?.(state);
    this.lastPhase = next;
  }
}
