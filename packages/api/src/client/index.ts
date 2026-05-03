export type {
  GameSummary,
  PlayerActionRecord,
  V1ViewData,
  VersionedViewData,
  StoredViewData,
} from './types';

export { isV1ViewData, unwrapV2MapText } from './viewData';

export { GameApiClient, BATTLES_API_HOSTNAME } from './GameApiClient';
