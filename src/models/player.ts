import { ID, HasID, sum } from "models/utils";
import GameMap from "models/map";
import UnitContainer, { UnitContainerData } from "models/unitcontainer";
import Territory from "models/territory";
import Unit from "models/unit";
import { Colour } from "models/values";

export type PlayerData = UnitContainerData & {
  type: "player";
  colour: Colour;
  territoryIds: ID[];
  gold: number;
  goldProduction: number;
  ready: boolean;
  neutralTerritoryCaptures: number;
  opponentTerritoryCaptures: number;
  unitsDestroyed: number;
};

export default class Player extends UnitContainer<PlayerData> {
  get territories() {
    return this.data.territoryIds.map(id => <Territory>this.map.modelMap[id]);
  }

  get victoryPoints() {
    return (
      this.data.gold +
      this.units.length +
      this.territories.length +
      sum(this.territories.map(territory => territory.data.properties.length)) +
      this.data.neutralTerritoryCaptures +
      2 * this.data.opponentTerritoryCaptures +
      this.data.unitsDestroyed
    );
  }

  resolveGold() {
    this.data.gold += this.data.goldProduction + sum(this.territories.map(territory => territory.goldProduction));
  }
}
