import { ID, HasID } from "models/utils";
import { GameMap } from "models/map";
import { UnitContainerData, UnitContainer } from "models/unitcontainer";
import { Territory } from "models/territory";
import { Unit } from "models/unit";
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

export type Player = UnitContainer & {
  data: PlayerData;
  territories: Territory[];
};

export function createPlayer(map: GameMap, playerData: PlayerData): Player {
  let player: Player = {
    get territories(this: Player) {
      return this.data.territoryIds.map(id => <Territory>map.idMap[id]);
    },
    get units(this: Player) {
      return this.data.unitIds.map(id => <Unit>map.idMap[id]);
    },
    data: playerData
  };
  return player;
}
