import type { Actions } from '@battles/models';

export type GameSummary = {
  gameId: string;
  turn: number;
  maxTurns: number;
  maxVictoryPoints: number;
  numTerritories: number;
  finished: boolean;
  leaderboard: { name: string; victoryPoints: number }[];
  updatedAt: number;
};

export type PlayerActionRecord = {
  actions: Actions.ModelAction[];
  updatedAt: number;
};

export type V1ViewData = {
  [territoryId: string]: { position: { x: number; y: number } };
};

export type VersionedViewData =
  | { version: 'v1'; data: V1ViewData }
  | { version: 'v2'; data: string };

export type StoredViewData = VersionedViewData | V1ViewData;
