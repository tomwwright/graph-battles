import { HasID, Model, unique } from './utils';

export abstract class UnitContainer<T extends HasID> extends Model<T> {
  get units() {
    return this.map.units.filter((unit) => unit.data.locationId == this.data.id);
  }

  hasCombat(): boolean {
    return unique(this.units.map((unit) => unit.data.playerId)).length > 1;
  }
}
