import { ID, HasID, Model, unique, exclude } from './utils';
import GameMap from './map';
import Unit from './unit';

export type UnitContainerData = HasID & {
  unitIds: ID[];
};

export default abstract class UnitContainer<T extends UnitContainerData = UnitContainerData> extends Model<T> {
  get units() {
    return this.data.unitIds.map((id) => <Unit>this.map.modelMap[id]);
  }

  remove(unitId: ID) {
    this.data.unitIds = exclude(this.data.unitIds, unitId);
  }

  hasCombat(): boolean {
    return unique(this.units.map((unit) => unit.data.playerId)).length > 1;
  }
}
