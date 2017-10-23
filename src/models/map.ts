import { ID, HasID, ModelMap, DataMap, Model, toID, clamp, clone, sum, unique, include, exclude } from 'models/utils';
import { Status, TerritoryActionDefinitions, propsToType, propsToActions } from 'models/values';
import Player, { PlayerData } from 'models/player';
import UnitContainer from 'models/unitcontainer';
import Combat from 'models/combat';
import Territory, { TerritoryData } from 'models/territory';
import Edge, { EdgeData } from 'models/edge';
import Unit, { UnitData } from 'models/unit';

import { ModelAction } from 'models/actions';
import { applyReadyPlayer } from 'models/actions/ready';
import { applyMoveUnits } from 'models/actions/move';
import { applyTerritoryAction } from 'models/actions/territory';

export type GameMapData = HasID & {
  dataMap: DataMap;
  territoryIds: ID[];
  playerIds: ID[];
  edgeIds: ID[];
  unitIds: ID[];
  nextId: number;
};

export default class GameMap extends UnitContainer<GameMapData> {
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

  findEdge(territoryAId: ID, territoryBId: ID) {
    return this.edges
      .filter(edge => edge.data.territoryAId === territoryAId || edge.data.territoryBId === territoryAId)
      .find(edge => edge.data.territoryAId === territoryBId || edge.data.territoryBId === territoryBId);
  }

  player(playerId: ID) {
    return this.players.find(player => player.data.id === playerId);
  }

  getCombats() {
    const combatLocations: UnitContainer[] = [];
    for (const edge of this.edges) {
      if (edge.hasCombat()) combatLocations.push(edge);
    }
    for (const territory of this.territories) {
      if (territory.hasCombat()) combatLocations.push(territory);
    }
    return combatLocations.map(location => new Combat(location));
  }

  applyAction(action: ModelAction) {
    switch (action.type) {
      case 'ready-player':
        applyReadyPlayer(this, action);
        break;
      case 'move-units':
        applyMoveUnits(this, action);
        break;
      case 'territory':
        applyTerritoryAction(this, action);
        break;
    }
  }

  addUnit(territory: Territory): GameMap {
    const unitData: UnitData = {
      id: toID(this.data.nextId),
      playerId: territory.data.playerId,
      locationId: territory.data.id,
      destinationId: null,
      statuses: [],
      foodConsumption: 1,
    };

    ++this.data.nextId;

    this.data.dataMap[unitData.id] = unitData;
    this.modelMap[unitData.id] = new Unit(this, unitData);

    this.data.unitIds.push(unitData.id);
    territory.data.unitIds.push(unitData.id);
    if (territory.player) territory.player.data.unitIds.push(unitData.id);

    return this;
  }

  resolveTurn(): GameMap {
    const map = new GameMap(clone(this.data));

    map.resolveRemoveDefendStatus();

    // resolve all combats (and then check if more combats occurred)
    map.resolveMoves();
    let combats = map.getCombats();
    while (combats.length > 0) {
      for (const combat of combats) {
        combat.resolve();
      }
      map.resolveMoves();
      combats = map.getCombats();
    }

    map.resolveFood();
    map.resolveGold();

    map.resolveAddDefendStatus(this);

    map.resolveTerritoryControl(this);
    map.resolveTerritoryActions();

    map.players.forEach(player => (player.data.ready = false));

    return map;
  }

  resolveGold() {
    this.players.forEach(player => {
      player.data.gold +=
        player.data.goldProduction + sum(player.territories.map(territory => territory.data.goldProduction));
    });
  }

  resolveFood() {
    for (let territory of this.territories) {
      territory.data.food += territory.data.foodProduction;

      const consumedFood = sum(territory.units.map(unit => unit.data.foodConsumption));
      territory.data.food -= consumedFood;
      for (let unit of territory.units) {
        if (territory.data.food < 0) unit.addStatus(Status.STARVE);
        else unit.removeStatus(Status.STARVE);
      }

      territory.data.food = clamp(territory.data.food, 0, territory.data.maxFood);
    }
  }

  resolveRemoveDefendStatus() {
    for (const unit of this.units) {
      if (unit.destination) unit.removeStatus(Status.DEFEND);
    }
  }

  resolveAddDefendStatus(previous: GameMap) {
    for (const unit of this.units) {
      const oldUnit = previous.unit(unit.data.id);
      if (oldUnit && !oldUnit.data.destinationId) unit.addStatus(Status.DEFEND);
    }
  }

  resolveCombat() {}

  resolveMoves() {
    // push all moving units onto their respective Edge
    const movingUnits = this.units.filter(unit => unit.data.destinationId !== null && unit.movementEdge);
    for (const unit of movingUnits) {
      exclude(unit.location.data.unitIds, unit.data.id);
      include(unit.movementEdge.data.unitIds, unit.data.id);
      unit.data.locationId = unit.movementEdge.data.id;
    }

    // now safe edges can immediately be resolved
    const safeEdges = this.edges.filter(edge => !edge.hasCombat());
    for (const edge of safeEdges) {
      for (const unit of edge.units) {
        include(unit.destination.data.unitIds, unit.data.id);
        unit.data.locationId = unit.data.destinationId;
        unit.data.destinationId = null;
      }
      edge.data.unitIds = [];
    }
  }

  resolveTerritoryActions() {
    for (let territory of this.territories) {
      let action = territory.data.currentAction;
      territory.data.currentAction = null;

      if (action && !territory.hasCombat()) {
        const actionDefinition = TerritoryActionDefinitions[action];
        actionDefinition.actionFunction(this, territory);

        territory.data.type = propsToType(territory.data.properties);
        territory.data.actions = propsToActions(territory.data.properties);
      }
    }
  }

  resolveTerritoryControl(previous: GameMap) {
    const populatedTerritories = this.territories.filter(territory => territory.data.unitIds.length > 0);
    for (const territory of populatedTerritories) {
      const oldTerritory = previous.territory(territory.data.id);
      const presentPlayers = unique(territory.units.map(unit => unit.data.playerId));
      const oldPlayers = unique(oldTerritory.units.map(unit => unit.data.playerId));

      if (
        presentPlayers.length == 1 &&
        oldPlayers.length == 1 &&
        presentPlayers[0] === oldPlayers[0] &&
        presentPlayers[0] !== territory.data.playerId
      ) {
        if (territory.player) exclude(territory.player.data.territoryIds, territory.data.id);
        territory.data.playerId = presentPlayers[0];
        include(territory.player.data.territoryIds, territory.data.id);
        territory.data.currentAction = null;
      }
    }
  }
}
