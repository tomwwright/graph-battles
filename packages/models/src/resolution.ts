import { ID } from './utils';

export type Resolution =
  | { phase: 'move'; unitId: ID }
  | { phase: 'combat'; locationId: ID }
  | { phase: 'add-defend'; unitId: ID }
  | { phase: 'food'; territoryId: ID }
  | { phase: 'gold'; playerId: ID }
  | { phase: 'territory-control'; territoryId: ID }
  | { phase: 'territory-action'; territoryId: ID };
