import { ID, sum } from './utils';
import { UnitContainer, UnitContainerData } from './unitcontainer';
import { Territory } from './territory';
import { Colour } from './values';

export type PlayerData = UnitContainerData & {
  type: 'player';
  colour: Colour;
  territoryIds: ID[];
  gold: number;
  goldProduction: number;
  ready: boolean;
  neutralTerritoryCaptures: number;
  opponentTerritoryCaptures: number;
  unitsDestroyed: number;
};

export class Player extends UnitContainer<PlayerData> {
  get territories() {
    return this.data.territoryIds.map((id) => <Territory>this.map.modelMap[id]);
  }

  get victoryPoints() {
    return (
      this.data.gold +
      this.units.length +
      this.territories.length +
      sum(this.territories.map((territory) => territory.data.properties.length)) +
      this.data.neutralTerritoryCaptures +
      2 * this.data.opponentTerritoryCaptures +
      this.data.unitsDestroyed
    );
  }

  resolveGold() {
    this.data.gold += this.data.goldProduction + sum(this.territories.map((territory) => territory.goldProduction));
  }
}
