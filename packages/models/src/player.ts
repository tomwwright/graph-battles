import { HasID, Model, sum } from './utils';
import { Colour } from './values';

export type PlayerData = HasID & {
  type: 'player';
  colour: Colour;
  gold: number;
};

export class Player extends Model<PlayerData> {
  get territories() {
    return this.map.territories.filter((territory) => territory.data.playerId === this.data.id);
  }

  get units() {
    return this.map.units.filter((unit) => unit.data.playerId === this.data.id);
  }

  get victoryPoints() {
    return (
      this.data.gold +
      this.units.length +
      this.territories.length +
      sum(this.territories.map((territory) => territory.data.properties.length))
    );
  }

  resolveGold() {
    this.data.gold += sum(this.territories.map((territory) => territory.goldProduction));
  }
}
