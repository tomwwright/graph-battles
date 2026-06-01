import { useSyncExternalStore } from 'react';
import { useGameOrchestrator } from '../ui/GameOrchestratorProvider';
import { StoreState } from './types';

/**
 * React hook wrapping useSyncExternalStore with selector pattern.
 * Components call useGameStore(s => s.turnPhase) to subscribe to specific slices.
 */
export function useGameStore<T>(selector: (state: StoreState) => T): T {
  const { store } = useGameOrchestrator();

  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store.getState())
  );
}
