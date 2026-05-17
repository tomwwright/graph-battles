import { StateChange, StoreState } from './types';
import { reducer } from './reducer';

type Listener = () => void;
type Unsubscribe = () => void;

/**
 * Pub/sub state container for game and UI state. State changes go through
 * `dispatch(action)` which runs the reducer.
 *
 * Every mutation produces a new shallow copy of `StoreState` so that
 * `useSyncExternalStore` detects changes even when inner references
 * (e.g. `GameMap`) are mutated in place.
 */
export class GameStore {
  private state: StoreState;
  private listeners = new Set<Listener>();
  private animationCounter = 0;

  constructor(initialState: StoreState) {
    this.state = initialState;
  }

  getState(): StoreState {
    return this.state;
  }

  dispatch(action: StateChange): void {
    console.log('ACTION', action);
    this.state = reducer(this.state, action);
    this.notify();
  }

  /**
   * Register an in-flight animation. Adds a token to `pendingAnimations` and
   * removes it when the promise settles. Callers can ignore the returned id —
   * it exists only so listeners awaiting idle can observe the lifecycle.
   *
   * Used by syncers to advertise "renderer animation in flight". The
   * resolution sequencer awaits `pendingAnimations.length === 0` between
   * generator steps so animations complete before the next mutation applies.
   */
  trackAnimation(promise: Promise<unknown>): string {
    const id = `anim-${++this.animationCounter}`;
    this.dispatch({ type: 'animation/started', id });
    promise.finally(() => this.dispatch({ type: 'animation/completed', id }));
    return id;
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
