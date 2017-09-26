import { ID, HasID, IDInstance } from "models/utils";
import { GameMap } from "models/map";
import { Unit } from "models/unit";

export type UnitContainerData = HasID & {
  unitIds: ID[];
};

export type UnitContainer = IDInstance & {
  data: UnitContainerData;
  units: Unit[];
};
