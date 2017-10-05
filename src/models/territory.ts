import { ID } from "models/utils";
import { GameMap } from "models/map";
import { UnitContainerData, UnitContainer } from "models/unitcontainer";
import { Player } from "models/player";
import { Edge } from "models/edge";
import { Unit } from "models/unit";
import { TerritoryProperty, TerritoryAction, TerritoryType } from "models/values";

export type TerritoryData = UnitContainerData & {
  edgeIds: ID[];
  playerId: ID;
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
  data: TerritoryData;
  player: Player;
  edges: Edge[];
  addProperty: (property: TerritoryProperty) => void;
};

export function createTerritory(map: GameMap, data: TerritoryData): Territory {
  let territory: Territory = {
    get edges(this: Territory) {
      return this.data.edgeIds.map(id => <Edge>map.idMap[id]);
    },
    get player(this: Territory) {
      return <Player>map.idMap[this.data.playerId];
    },
    get units(this: Territory) {
      return this.data.unitIds.map(id => <Unit>map.idMap[id]);
    },
    addProperty(property: TerritoryProperty) {
      if (!territory.data.properties.find(p => p === property)) territory.data.properties.push(property);
    },
    data
  };
  return territory;
}
