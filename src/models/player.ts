import { ID, HasID } from "models/utils";
import GameMap from "models/map";
import UnitContainer, { UnitContainerData } from "models/unitcontainer";
import Territory from "models/territory";
import Unit from "models/unit";
import { Colour } from "models/values";

export type PlayerData = UnitContainerData & {
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
}
