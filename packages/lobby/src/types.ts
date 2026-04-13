type TerritoryViewData = {
  position: {
    x: number;
    y: number;
  };
};

export type V1ViewData = { [id: string]: TerritoryViewData };

export type VersionedViewData =
  | { version: 'v1'; data: V1ViewData }
  | { version: 'v2'; data: string };

/** Backwards compat: legacy data has no version field */
export type StoredViewData = VersionedViewData | V1ViewData;

export type ClientVersion = 'v1' | 'v2';
export type GameMode = 'local' | 'remote';
