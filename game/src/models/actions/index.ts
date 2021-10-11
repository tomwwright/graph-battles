import { ReadyPlayerModelAction } from "models/actions/ready";
import { MoveUnitsModelAction } from "models/actions/move";
import { TerritoryModelAction } from "models/actions/territory";

export type ModelAction = ReadyPlayerModelAction | MoveUnitsModelAction | TerritoryModelAction;
