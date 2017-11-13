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

  winningPlayers(requiredVictoryPoints: number) {
    const territoryControllers = unique(this.territories.map(territory => territory.player ? territory.player.data.id : null));
    if (territoryControllers.length == 1)
      return territoryControllers.map(id => this.player(id));

    return this.players.filter(player => player.victoryPoints >= requiredVictoryPoints).sort((a, b) => a.victoryPoints - b.victoryPoints);
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
      statuses: []
    };

    ++this.data.nextId;

    this.data.dataMap[unitData.id] = unitData;
    this.modelMap[unitData.id] = new Unit(this, unitData);

    this.data.unitIds.push(unitData.id);
    territory.data.unitIds.push(unitData.id);
    if (territory.player) territory.player.data.unitIds.push(unitData.id);

    return this;
  }

  removeUnit(unit: Unit): GameMap {
    if (unit.data.playerId) unit.player.remove(unit.data.id);
    unit.location.remove(unit.data.id);
    this.remove(unit.data.id);
    delete this.data.dataMap[unit.data.id];
    unit.data.locationId = null;

    return this;
  }

  resolveTurn() {
    const previous = new GameMap(clone(this.data));

    this.resolveRemoveDefendStatus();

    // resolve all combats (and then check if more combats occurred)
    this.resolveMoves();
    let combats = this.getCombats();
    while (combats.length > 0) {
      for (const combat of combats) {
        combat.resolve();
      }
      this.resolveMoves();
      combats = this.getCombats();
    }

    this.resolveAddDefendStatus(previous);

    this.resolveFood();
    this.resolveGold();

    this.resolveTerritoryControl(previous);
    this.resolveTerritoryActions();

    this.players.forEach(player => (player.data.ready = false));
  }

  resolveGold() {
    this.players.forEach(player => player.resolveGold());
  }

  resolveFood() {
    for (let territory of this.territories) {
      territory.resolveFood();
    }
  }

  resolveRemoveDefendStatus() {
    for (const unit of this.units) {
      unit.resolveRemoveDefendStatus();
    }
  }

  resolveAddDefendStatus(previous: GameMap) {
    for (const unit of this.units) {
      const previousUnit = previous.unit(unit.data.id);
      unit.resolveAddDefendStatus(previousUnit);
    }
  }

  resolveMoves() {
    // push all moving units onto their respective Edge
    const movingUnits = this.units.filter(unit => unit.data.destinationId !== null && unit.movementEdge);
    movingUnits.forEach(unit => unit.resolveMove());

    // now safe edges can immediately be resolved
    const safeEdges = this.edges.filter(edge => !edge.hasCombat());
    for (const edge of safeEdges) {
      edge.units.forEach(unit => unit.resolveMove());
    }
  }

  resolveTerritoryActions() {
    for (let territory of this.territories) {
      territory.resolveTerritoryAction();
    }
  }

  resolveTerritoryControl(previous: GameMap) {
    const populatedTerritories = this.territories.filter(territory => territory.data.unitIds.length > 0);
    for (const territory of populatedTerritories) {
      const previousTerritory = previous.territory(territory.data.id);
      territory.resolveTerritoryControl(previousTerritory);
    }
  }
}
