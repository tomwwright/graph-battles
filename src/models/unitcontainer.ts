import { ID, HasID, Model, unique } from "models/utils";
import GameMap from "models/map";
import Unit from "models/unit";

export type UnitContainerData = HasID & {
  unitIds: ID[];
};

export default abstract class UnitContainer<T extends UnitContainerData = UnitContainerData> extends Model<T> {
  get units() {
    return this.data.unitIds.map(id => <Unit>this.map.modelMap[id]);
  }

  hasCombat(): boolean {
    return unique(this.units.map(unit => unit.data.playerId)).length > 1;
  }
}
