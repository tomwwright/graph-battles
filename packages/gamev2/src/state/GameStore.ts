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
