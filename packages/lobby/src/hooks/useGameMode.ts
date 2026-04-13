import { useLocalStorageState } from './useLocalStorageState';
import type { GameMode } from '../types';

const KEY = 'graph-battles-lobby-gameMode';

export function useGameMode() {
  return useLocalStorageState<GameMode>(KEY, 'local');
}
