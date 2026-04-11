import { useContext, useSyncExternalStore } from 'react';
import { GameStoreContext } from '../ui/GameContextProvider';
import { StoreState } from './types';

/**
 * React hook wrapping useSyncExternalStore with selector pattern.
 * Components call useGameStore(s => s.turnPhase) to subscribe to specific slices.
 */
export function useGameStore<T>(selector: (state: StoreState) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) {
    throw new Error('useGameStore must be used within a GameContextProvider');
  }

  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store.getState())
  );
}
