import { ReadyPlayerModelAction } from './ready';
import { MoveUnitModelAction } from './move';
import { TerritoryModelAction } from './territory';

export type ModelAction = ReadyPlayerModelAction | MoveUnitModelAction | TerritoryModelAction;

export * from './ready';
export * from './move';
export * from './territory';
