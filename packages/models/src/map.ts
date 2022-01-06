import { ID, HasID, ModelMap, DataMap, toID, clone, unique, ModelData, exclude } from './utils';
import { Player, PlayerData } from './player';
import { UnitContainer } from './unitcontainer';
import { Combat } from './combat';
import { Territory, TerritoryData } from './territory';
import { Edge, EdgeData } from './edge';
import { Unit, UnitData } from './unit';

import { ModelAction } from './actions';
import { applyReadyPlayer } from './actions/ready';
import { applyMoveUnits } from './actions/move';
import { applyTerritoryAction } from './actions/territory';

export type GameMapData = HasID & {
  type: 'map';
  dataMap: DataMap;
  territoryIds: ID[];
  playerIds: ID[];
  edgeIds: ID[];
  unitIds: ID[];
  nextId: number;
};

export class GameMap extends UnitContainer<GameMapData> {
  modelMap: ModelMap = {};

  constructor(data: GameMapData) {
    super(null, data);
    this.map = this;

    data.playerIds.forEach((id) => (this.modelMap[id] = new Player(this, <PlayerData>data.dataMap[id])));
    data.unitIds.forEach((id) => (this.modelMap[id] = new Unit(this, <UnitData>data.dataMap[id])));
    data.territoryIds.forEach((id) => (this.modelMap[id] = new Territory(this, <TerritoryData>data.dataMap[id])));
    data.edgeIds.forEach((id) => (this.modelMap[id] = new Edge(this, <EdgeData>data.dataMap[id])));
  }

  get territories() {
    return this.data.territoryIds.map((id) => <Territory>this.modelMap[id]);
  }

  get players() {
    return this.data.playerIds.map((id) => <Player>this.modelMap[id]);
  }

  get edges() {
    return this.data.edgeIds.map((id) => <Edge>this.modelMap[id]);
  }

  get units() {
    return this.data.unitIds.map((id) => <Unit>this.modelMap[id]);
  }

  unit(unitId: ID) {
    return this.units.find((unit) => unit.data.id === unitId);
  }

  territory(territoryId: ID) {
    return this.territories.find((territory) => territory.data.id === territoryId);
  }

  edge(edgeId: ID) {
    return this.edges.find((edge) => edge.data.id === edgeId);
  }

  findEdge(territoryAId: ID, territoryBId: ID) {
    return this.edges
      .filter((edge) => edge.data.territoryAId === territoryAId || edge.data.territoryBId === territoryAId)
      .find((edge) => edge.data.territoryAId === territoryBId || edge.data.territoryBId === territoryBId);
  }

  player(playerId: ID) {
    return this.players.find((player) => player.data.id === playerId);
  }

  getCombats() {
    const combatLocations: UnitContainer<ModelData>[] = [];
    for (const edge of this.edges) {
      if (edge.hasCombat()) combatLocations.push(edge);
    }
    for (const territory of this.territories) {
      if (territory.hasCombat()) combatLocations.push(territory);
    }
    return combatLocations.map((location) => new Combat(location));
  }

  winningPlayers(requiredVictoryPoints: number, isGameOver: boolean) {
    const territoryControllers = unique(
      this.territories.map((territory) => (territory.player ? territory.player.data.id : null))
    );
    if (territoryControllers.length == 1) return territoryControllers.map((id) => this.player(id));

    const highestVictoryPoints = Math.max(...this.players.map((player) => player.victoryPoints));
    const leadingPlayers = this.players.filter((player) => player.victoryPoints == highestVictoryPoints);
    if (isGameOver) return leadingPlayers;
    else return leadingPlayers.filter((player) => player.victoryPoints >= requiredVictoryPoints);
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
      type: 'unit',
      id: toID(this.data.nextId),
      playerId: territory.data.playerId,
      locationId: territory.data.id,
      destinationId: null,
      statuses: [],
    };

    ++this.data.nextId;

    this.data.dataMap[unitData.id] = unitData;
    this.modelMap[unitData.id] = new Unit(this, unitData);

    this.data.unitIds.push(unitData.id);

    return this;
  }

  removeUnit(unit: Unit): GameMap {
    this.data.unitIds = exclude(this.data.unitIds, unit.data.id);
    delete this.data.dataMap[unit.data.id];
    unit.data.locationId = null;

    return this;
  }

  resolveTurn() {
    const previous = new GameMap(clone(this.data));

    this.resolveRemoveDefendStatus();

    this.resolveMovesAndCombats();

    this.resolveAddDefendStatus(previous);

    this.resolveFood();
    this.resolveGold();

    this.resolveTerritoryControl(previous);
    this.resolveTerritoryActions();

    this.unreadyPlayers();
  }

  resolveGold() {
    this.players.forEach((player) => player.resolveGold());
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
    const movingUnits = this.units.filter((unit) => unit.data.destinationId !== null && unit.movementEdge);
    movingUnits.forEach((unit) => unit.resolveMove());

    // now safe edges can immediately be resolved
    const safeEdges = this.edges.filter((edge) => !edge.hasCombat());
    for (const edge of safeEdges) {
      edge.units.forEach((unit) => unit.resolveMove());
    }
  }

  resolveMovesAndCombats() {
    this.resolveMoves();

    // resolve all combats (and then check if more combats occurred)
    let combats = this.getCombats();
    while (combats.length > 0) {
      for (const combat of combats) {
        combat.resolve();
      }
      this.resolveMoves();
      combats = this.getCombats();
    }
  }

  resolveTerritoryActions() {
    for (let territory of this.territories) {
      territory.resolveTerritoryAction();
    }
  }

  resolveTerritoryControl(previous: GameMap) {
    const populatedTerritories = this.territories.filter((territory) => territory.units.length > 0);
    for (const territory of populatedTerritories) {
      const previousTerritory = previous.territory(territory.data.id);
      territory.resolveTerritoryControl(previousTerritory);
    }
  }

  unreadyPlayers() {
    this.players.forEach((player) => (player.data.ready = false));
  }
}
