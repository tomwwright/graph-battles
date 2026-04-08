import { StoreState } from './types';

type Listener = () => void;

/**
 * Pub/sub state container for game and UI state.
 * Every mutation produces a new shallow copy of StoreState so that
 * useSyncExternalStore detects changes even when inner references
 * (e.g. GameMap) are mutated in place.
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

  setState(updater: Partial<StoreState> | ((prev: StoreState) => Partial<StoreState>)): void {
    const partial = typeof updater === 'function' ? updater(this.state) : updater;
    console.log('STATE', partial);
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
