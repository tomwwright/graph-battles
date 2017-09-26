import { ID } from "models/utils";
import { GameMap } from "models/map";
import { UnitContainerData, UnitContainer } from "models/unitcontainer";
// import { Player } from "models/player";
// import { Edge } from "models/edge";
import { Unit } from "models/unit";
import { TerritoryProperty, TerritoryAction, TerritoryType } from "models/values";

export type TerritoryData = UnitContainerData & {
  //edgeIds: ID[];
  // playerId: ID;
  food: number;
  foodProduction: number;
  maxFood: number;
  goldProduction: number;
  properties: TerritoryProperty[];
  actions: TerritoryAction[];
  type: TerritoryType;
  currentAction: TerritoryAction;
};

export type Territory = UnitContainer & {
  units: Unit[];
};

export function createTerritory(map: GameMap, data: TerritoryData): Territory {
  let territory: Territory = {
    // get edges(this: Territory) {
    //   return this.edgeIds.map(id => <Edge>map.idMap.get(id));
    // },
    // get player(this: Territory) {
    //   return <Player>map.idMap.get(this.playerId);
    // },
    get units(this: Territory) {
      return this.data.unitIds.map(id => <Unit>map.idMap[id]);
    },
    data
  };
  return territory;
}
