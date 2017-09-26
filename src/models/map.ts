import { ID, HasID, IDMap, DataMap, IDInstance } from "models/utils";
// import { PlayerData, Player, createPlayer } from "models/player";
import { TerritoryData, Territory, createTerritory } from "models/territory";
// import { EdgeData, Edge, createEdge } from "models/edge";
import { UnitData, Unit, createUnit } from "models/unit";

export type GameMapData = HasID & {
  dataMap: DataMap;
  territoryIds: ID[];
  // playerIds: ID[];
  // edgeIds: ID[];
  unitIds: ID[];
  nextId: number;
};

export type GameMap = IDInstance & {
  data: GameMapData;
  idMap: IDMap;
  territories: Territory[];
  // players: Player[];
  // edges: Edge[];
  units: Unit[];
};

export function createMap(data: GameMapData): GameMap {
  let map: GameMap = {
    get territories(this: GameMap) {
      return this.data.territoryIds.map(id => <Territory>this.idMap[id]);
    },
    // get players(this: GameMap) {
    //   return this.playerIds.map(id => <Player>this.idMap.get(id));
    // },
    // get edges(this: GameMap) {
    //   return this.edgeIds.map(id => <Edge>this.idMap.get(id));
    // },
    get units(this: GameMap) {
      return this.data.unitIds.map(id => <Unit>this.idMap[id]);
    },
    data,
    idMap: {}
  };

  // map.playerIds.forEach(id => instanceMap.set(id, createPlayer(map, <PlayerData>dataMap.get(id))));
  map.data.unitIds.forEach(id => (map.idMap[id] = createUnit(map, <UnitData>data.dataMap[id])));
  map.data.territoryIds.forEach(id => (map.idMap[id] = createTerritory(map, <TerritoryData>data.dataMap[id])));
  // map.edgeIds.forEach(id => instanceMap.set(id, createEdge(map, <EdgeData>dataMap.get(id))));

  return map;
}
