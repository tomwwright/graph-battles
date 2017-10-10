import { ID, HasID, IDMap, DataMap, IDInstance, toID, clone } from "models/utils";
import { PlayerData, Player, createPlayer } from "models/player";
import { TerritoryData, Territory, createTerritory } from "models/territory";
import { EdgeData, Edge, createEdge } from "models/edge";
import { UnitData, Unit, createUnit } from "models/unit";

export type GameMapData = HasID & {
  dataMap: DataMap;
  territoryIds: ID[];
  playerIds: ID[];
  edgeIds: ID[];
  unitIds: ID[];
  nextId: number;
};

export type GameMap = IDInstance & {
  data: GameMapData;
  idMap: IDMap;
  territories: Territory[];
  players: Player[];
  edges: Edge[];
  units: Unit[];
  addUnit: (territory: Territory) => GameMap;
  unit: (unitId: ID) => Unit;
  territory: (territoryId: ID) => Territory;
  edge: (edgeId: ID) => Edge;
  player: (playerId: ID) => Player;
};

export function createMap(data: GameMapData): GameMap {
  let map: GameMap = {
    get territories(this: GameMap) {
      return this.data.territoryIds.map(id => <Territory>this.idMap[id]);
    },
    get players(this: GameMap) {
      return this.data.playerIds.map(id => <Player>this.idMap[id]);
    },
    get edges(this: GameMap) {
      return this.data.edgeIds.map(id => <Edge>this.idMap[id]);
    },
    get units(this: GameMap) {
      return this.data.unitIds.map(id => <Unit>this.idMap[id]);
    },
    unit(unitId: ID) {
      return map.units.find(unit => unit.data.id === unitId);
    },
    territory(territoryId: ID) {
      return map.territories.find(territory => territory.data.id === territoryId);
    },
    edge(edgeId: ID) {
      return map.edges.find(edge => edge.data.id === edgeId);
    },
    player(playerId: ID) {
      return map.players.find(player => player.data.id === playerId);
    },
    addUnit: (territory: Territory) => addUnit(map, territory),
    data,
    idMap: {}
  };

  map.data.playerIds.forEach(id => (map.idMap[id] = createPlayer(map, <PlayerData>data.dataMap[id])));
  map.data.unitIds.forEach(id => (map.idMap[id] = createUnit(map, <UnitData>data.dataMap[id])));
  map.data.territoryIds.forEach(id => (map.idMap[id] = createTerritory(map, <TerritoryData>data.dataMap[id])));
  map.data.edgeIds.forEach(id => (map.idMap[id] = createEdge(map, <EdgeData>data.dataMap[id])));

  return map;
}

export function addUnit(map: GameMap, territory: Territory): GameMap {
  map = createMap(clone(map.data));
  territory = <Territory>map.idMap[territory.data.id];

  const unitData: UnitData = {
    id: toID(map.data.nextId),
    playerId: territory.data.playerId,
    locationId: territory.data.id,
    destinationId: null,
    movementEdgeId: null,
    statuses: [],
    foodConsumption: 1
  };

  territory.data.unitIds.push(unitData.id);
  map.data.unitIds.push(unitData.id);
  if (territory.player) territory.player.data.unitIds.push(unitData.id);

  return createMap(map.data);
}
