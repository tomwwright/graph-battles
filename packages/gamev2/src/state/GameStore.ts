import { StoreState } from './types';

type Listener = () => void;
type Unsubscribe = () => void;

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
    // GameMap is mutated in place, so the reference may be unchanged.
    // Auto-bump mapRevision whenever `map` is in the partial so map-derived
    // selectors via useSyncExternalStore re-run.
    const next: Partial<StoreState> =
      'map' in partial
        ? { ...partial, mapRevision: (this.state.mapRevision ?? 0) + 1 }
        : partial;
    this.state = { ...this.state, ...next };
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
