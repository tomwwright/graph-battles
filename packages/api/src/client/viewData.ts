import type { StoredViewData, V1ViewData, VersionedViewData } from './types';

export function isV1ViewData(
  stored: StoredViewData,
): stored is V1ViewData | { version: 'v1'; data: V1ViewData } {
  if (!stored || typeof stored !== 'object') return false;
  if (!('version' in stored)) return true;
  return (stored as VersionedViewData).version === 'v1';
}

export function unwrapV2MapText(stored: StoredViewData): string {
  if (isV1ViewData(stored)) throw new Error('v1-view-data');
  const env = stored as VersionedViewData;
  if (env.version !== 'v2') throw new Error(`unknown-view-data-version:${(env as VersionedViewData).version}`);
  return env.data;
}
