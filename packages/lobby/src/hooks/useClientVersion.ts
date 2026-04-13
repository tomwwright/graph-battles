import { useLocalStorageState } from './useLocalStorageState';
import type { ClientVersion } from '../types';

const KEY = 'graph-battles-lobby-clientVersion';

export function useClientVersion() {
  return useLocalStorageState<ClientVersion>(KEY, 'v1');
}
