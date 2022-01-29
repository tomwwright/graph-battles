import { ID, HasID, ModelMap, DataMap, toID, clone, unique, ModelData, include, exclude, isEqual } from './utils';
import { Player, PlayerData } from './player';
import { UnitContainer } from './unitcontainer';
import { Combat } from './combat';
import { Territory, TerritoryData } from './territory';
import { Edge, EdgeData } from './edge';
import { Unit, UnitData } from './unit';

import { ModelAction } from './actions';
import { applyMoveUnits } from './actions/move';
import { applyTerritoryAction } from './actions/territory';

export type GameMapData = HasID & {
  type: 'map';
  dataMap: DataMap;
  nextId: number;
  actions: ModelAction[];
};

export class GameMap extends UnitContainer<GameMapData> {
  modelMap: ModelMap = {};

  constructor(data: GameMapData) {
    super(null, data);
    this.map = this;
    this.initialiseModelMap(data.dataMap);
  }

  get territories() {
    return Object.values(this.modelMap).filter((model) => model.data.type === 'territory') as Territory[];
  }

  get territoryIds() {
    return this.territories.map((territory) => territory.data.id);
  }

  get players() {
    return Object.values(this.modelMap).filter((model) => model.data.type === 'player') as Player[];
  }

  get playerIds() {
    return this.players.map((player) => player.data.id);
  }

  get edges() {
    return Object.values(this.modelMap).filter((model) => model.data.type === 'edge') as Edge[];
  }

  get edgeIds() {
    return this.edges.map((edge) => edge.data.id);
  }

  get units() {
    return Object.values(this.modelMap).filter((model) => model.data.type === 'unit') as Unit[];
  }

  get unitIds() {
    return this.units.map((unit) => unit.data.id);
  }

  unit(unitId: ID) {
    const model = this.modelMap[unitId];
    if (!model || model.data.type !== 'unit') return null;
    return model as Unit;
  }

  territory(territoryId: ID) {
    const model = this.modelMap[territoryId];
    if (!model || model.data.type !== 'territory') return null;
    return model as Territory;
  }

  edge(edgeId: ID) {
    const model = this.modelMap[edgeId];
    if (!model || model.data.type !== 'edge') return null;
    return model as Edge;
  }

  findEdge(territoryAId: ID, territoryBId: ID) {
    return this.edges
      .filter((edge) => edge.data.territoryAId === territoryAId || edge.data.territoryBId === territoryAId)
      .find((edge) => edge.data.territoryAId === territoryBId || edge.data.territoryBId === territoryBId);
  }

  player(playerId: ID) {
    const model = this.modelMap[playerId];
    if (!model || model.data.type !== 'player') return null;
    return model as Player;
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
      case 'move-unit':
        applyMoveUnits(this, action);
        break;
      case 'territory':
        applyTerritoryAction(this, action);
        break;
      case 'ready-player': // no-op
    }
  }

  addAction(action: ModelAction) {
    this.data.actions = include(this.data.actions, action, isEqual);
  }

  removeAction(action: ModelAction) {
    this.data.actions = exclude(this.data.actions, action, isEqual);
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

    return this;
  }

  removeUnit(unit: Unit): GameMap {
    delete this.data.dataMap[unit.data.id];
    delete this.modelMap[unit.data.id];
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

  private initialiseModelMap(data: DataMap): void {
    for (const modelData of Object.values(data)) {
      switch (modelData.type) {
        case 'edge':
          this.modelMap[modelData.id] = new Edge(this, modelData);
          break;
        case 'player':
          this.modelMap[modelData.id] = new Player(this, modelData);
          break;
        case 'territory':
          this.modelMap[modelData.id] = new Territory(this, modelData);
          break;
        case 'unit':
          this.modelMap[modelData.id] = new Unit(this, modelData);
          break;
      }
    }
  }
}
