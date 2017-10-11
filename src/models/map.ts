import { ID, HasID, ModelMap, DataMap, Model, toID, clone } from "models/utils";
import Player, { PlayerData } from "models/player";
import Territory, { TerritoryData } from "models/territory";
import Edge, { EdgeData } from "models/edge";
import Unit, { UnitData } from "models/unit";

export type GameMapData = HasID & {
  dataMap: DataMap;
  territoryIds: ID[];
  playerIds: ID[];
  edgeIds: ID[];
  unitIds: ID[];
  nextId: number;
};

export default class GameMap extends Model<GameMapData> {
  modelMap: ModelMap = {};

  constructor(data: GameMapData) {
    super(null, data);
    this.map = this;

    data.playerIds.forEach(id => (this.modelMap[id] = new Player(this, <PlayerData>data.dataMap[id])));
    data.unitIds.forEach(id => (this.modelMap[id] = new Unit(this, <UnitData>data.dataMap[id])));
    data.territoryIds.forEach(id => (this.modelMap[id] = new Territory(this, <TerritoryData>data.dataMap[id])));
    data.edgeIds.forEach(id => (this.modelMap[id] = new Edge(this, <EdgeData>data.dataMap[id])));
  }

  get territories() {
    return this.data.territoryIds.map(id => <Territory>this.modelMap[id]);
  }

  get players() {
    return this.data.playerIds.map(id => <Player>this.modelMap[id]);
  }

  get edges() {
    return this.data.edgeIds.map(id => <Edge>this.modelMap[id]);
  }

  get units() {
    return this.data.unitIds.map(id => <Unit>this.modelMap[id]);
  }

  unit(unitId: ID) {
    return this.units.find(unit => unit.data.id === unitId);
  }

  territory(territoryId: ID) {
    return this.territories.find(territory => territory.data.id === territoryId);
  }

  edge(edgeId: ID) {
    return this.edges.find(edge => edge.data.id === edgeId);
  }

  player(playerId: ID) {
    return this.players.find(player => player.data.id === playerId);
  }

  addUnit(territory: Territory): GameMap {
    const unitData: UnitData = {
      id: toID(this.data.nextId),
      playerId: territory.data.playerId,
      locationId: territory.data.id,
      destinationId: null,
      movementEdgeId: null,
      statuses: [],
      foodConsumption: 1
    };

    ++this.data.nextId;

    this.data.dataMap[unitData.id] = unitData;
    this.modelMap[unitData.id] = new Unit(this, unitData);

    this.data.unitIds.push(unitData.id);
    territory.data.unitIds.push(unitData.id);
    if (territory.player) territory.player.data.unitIds.push(unitData.id);

    return this;
  }
}
