import { useLocalStorageState } from './useLocalStorageState';

const KEY = 'graph-battles-lobby-playerName';

export function usePlayerName() {
  return useLocalStorageState<string>(KEY, '');
}
