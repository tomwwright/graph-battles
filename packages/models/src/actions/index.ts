import { ReadyPlayerModelAction } from './ready';
import { MoveUnitsModelAction } from './move';
import { TerritoryModelAction } from './territory';

export type ModelAction = ReadyPlayerModelAction | MoveUnitsModelAction | TerritoryModelAction;

export * from './ready';
export * from './move';
export * from './territory';
