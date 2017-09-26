import { ID, HasID } from "models/utils";
import { GameMap } from "models/map";
import { UnitContainerData, UnitContainer } from "models/unitcontainer";
import { Territory } from "models/territory";
import { Unit } from "models/unit";

export type PlayerData = UnitContainerData & {
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
      return this.data.territoryIds.map(id => <Territory>this.idMap.get(id));
    },
    get units(this: Player) {
      return this.data.unitIds.map(id => <Unit>this.idMap.get(id));
    },
    data: playerData,
    idMap: map.idMap
  };
  return player;
}
