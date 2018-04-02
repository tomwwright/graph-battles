
import { MoveUnitsModelAction } from 'models/actions/move';
import { TerritoryModelAction } from 'models/actions/territory';
import { observable, action, computed } from 'mobx';
import PhaserStore from 'game/stores/phaser';
import { ID, clone, contains, exclude, excludeAll } from 'models/utils';
import Game, { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';
import UnitContainer from 'models/unitcontainer';
import Player from 'models/player';
import Territory from 'models/territory';
import { TerritoryAction, Status } from 'models/values';
import { ModelAction } from 'models/actions';
import { lchmod } from 'fs';

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER
}

export enum ResolveState {
  NONE = "none",
  MOVES = "moves",
  EDGE_MOVES = "edge-moves",
  COMBATS = "combats",
  ADD_DEFEND = "add-defend",
  GOLD = "gold",
  FOOD = "food",
  TERRITORY_CONTROL = "territory-control",
  TERRITORY_ACTIONS = "territory-actions"
};

export default class GameStore {
  phaserStore: PhaserStore;

  @observable.ref game: Game;
  @observable.ref map: GameMap = null;
  @observable resolveState: ResolveState = ResolveState.NONE;
  @observable unresolvedMap: GameMap = null;
  @observable resolveIds: ID[] = [];

  @observable turn: number = 1;
  @observable currentPlayerId: ID;
  @observable visibilityMode: VisibilityMode = VisibilityMode.NOT_VISIBLE;

  constructor(phaserStore: PhaserStore) {
    this.phaserStore = phaserStore;
  }

  @computed
  get currentPlayer(): Player {
    return this.map.player(this.currentPlayerId);
  }

  @computed
  get isReplaying() {
    return this.turn < this.game.turn;
  }

  @computed
  get visibility() {
    const visibility: Map<ID, boolean> = new Map();
    if (this.visibilityMode == VisibilityMode.CURRENT_PLAYER) {
      const territories = this.map.territories;
      const edges = this.map.edges;

      territories.forEach(territory => visibility.set(territory.data.id, false));
      edges.forEach(edge => visibility.set(edge.data.id, false));

      const player = this.map.player(this.currentPlayerId);
      if (player) {
        for (const territory of player.territories) {
          visibility.set(territory.data.id, true);
          territory.edges.map(edge => edge.other(territory).data.id).forEach(id => visibility.set(id, true));
        }
        for (const edge of edges) {
          if (visibility.get(edge.data.territoryAId) && visibility.get(edge.data.territoryBId)) {
            visibility.set(edge.data.id, true);
          }
        }
        for (const unit of player.units) {
          visibility.set(unit.location.data.id, true);
        }
      }
    } else {
      const isVisible = this.visibilityMode == VisibilityMode.VISIBLE;
      this.map.territories.forEach(territory => visibility.set(territory.data.id, isVisible));
      this.map.edges.forEach(territory => visibility.set(territory.data.id, isVisible));
    }
    return visibility;
  }

  @computed
  get combats() {
    return this.map.getCombats();
  }

  @action
  setVisibility(mode: VisibilityMode) {
    this.visibilityMode = mode;
  }

  @action
  setGame(gameData: GameData) {
    this.game = new Game(gameData);
  }

  @action
  setMap(mapData: GameMapData) {
    this.map = new GameMap(mapData);
  }

  @action
  setCurrentPlayer(playerId: ID) {
    this.currentPlayerId = playerId;
  }

  @action
  setTurn(turn: number) {
    if (turn < 1 || turn > this.game.data.maps.length)
      throw new Error(`Invalid turn number: ${turn}`);
    this.turn = turn;
    if (this.isReplaying) {
      this.setMap(clone(this.game.data.maps[turn - 1]));
      this.unresolvedMap = new GameMap(clone(this.game.data.maps[turn - 1]));
      this.toMovesState();
    } else {
      this.setMap(this.game.data.maps[turn - 1]); // don't clone, we need to apply model actions to the real copy!
      this.unresolvedMap = null;
      this.resolveIds = [];
      this.resolveState = ResolveState.NONE;
    }
  }

  @action
  resolveTurn() {
    const next = new GameMap(clone(this.map.data));
    next.resolveTurn();
    this.game.data.maps.push(next.data);
  }

  @action
  resolveMoves() {
    this.map.resolveMoves();

    this.resolveState = ResolveState.COMBATS;
    this.setMap(this.map.data);
  }

  @action
  applyModelAction(action: ModelAction) {
    this.map.applyAction(action);

    this.setMap(this.map.data);
  }

  @action
  onTerritoryAction(territory: Territory, action: TerritoryAction) {
    this.applyModelAction({
      type: 'territory',
      playerId: this.currentPlayerId,
      territoryId: territory.data.id,
      action: action,
    } as TerritoryModelAction);
  }

  @action
  onMoveUnits(unitIds: ID[], territoryId: ID) {
    this.applyModelAction({
      type: 'move-units',
      playerId: this.currentPlayerId,
      destinationId: territoryId,
      unitIds: unitIds,
    } as MoveUnitsModelAction);
  }

  @action
  resolve(id: ID) {
    if (!contains(this.resolveIds, id))
      throw new Error(`ID ${id} not a valid resolve ID!`);

    this.resolveIds = exclude(this.resolveIds, id);

    switch (this.resolveState) {
      case ResolveState.MOVES:
      case ResolveState.EDGE_MOVES:
        this.resolveMove(id);
        break;
      case ResolveState.COMBATS:
        this.resolveCombat(id);
        break;
      case ResolveState.ADD_DEFEND:
        this.resolveAddDefend(id);
        break;
      case ResolveState.FOOD:
        this.resolveFood(id);
        break;
      case ResolveState.GOLD:
        this.resolveGold(id);
        break;
      case ResolveState.TERRITORY_CONTROL:
        this.resolveTerritoryControl(id);
        break;
      case ResolveState.TERRITORY_ACTIONS:
        this.resolveTerritoryAction(id);
        break;
    }

    if (this.resolveIds.length == 0) {
      switch (this.resolveState) {
        case ResolveState.MOVES:
          this.toEdgeMovesState();
          break;
        case ResolveState.EDGE_MOVES:
          this.toCombatsState();
          if (this.resolveIds.length == 0) {
            this.toAddDefendState();
          }
          break;
        case ResolveState.COMBATS:
          this.toEdgeMovesState();
          if (this.resolveIds.length == 0) {
            this.toAddDefendState();
          }
          break;
        case ResolveState.ADD_DEFEND:
          this.toFoodState();
          break;
        case ResolveState.FOOD:
          this.toGoldState();
          break;
        case ResolveState.GOLD:
          this.toTerritoryControlState();
          break;
        case ResolveState.TERRITORY_CONTROL:
          this.toTerritoryActionState();
          break;
        case ResolveState.TERRITORY_ACTIONS:
          this.resolveState = ResolveState.NONE;
          break;
      }
    }

    this.setMap(this.map.data);
  }

  private resolveMove(unitId: ID) {
    const unit = this.map.unit(unitId);
    if (!unit) throw new Error(`No unit ${unitId}`);

    unit.resolveRemoveDefendStatus();
    unit.resolveMove();
  }

  private resolveCombat(locationId: ID) {
    const combat = this.map.getCombats().find(combat => combat.location.data.id === locationId);
    if (!combat) throw new Error(`No combat on Location ${locationId}`);

    combat.resolve();
  }

  private resolveAddDefend(unitId: ID) {
    const unit = this.map.unit(unitId);
    if (!unit) throw new Error(`No unit ${unitId}`);

    const unresolvedUnit = this.unresolvedMap.unit(unitId);

    unit.resolveAddDefendStatus(unresolvedUnit);
  }

  private resolveFood(territoryId: ID) {
    const territory = this.map.territory(territoryId);
    if (!territory) throw new Error(`No territory ${territoryId}`);

    territory.resolveFood();
  }

  private resolveGold(playerId: ID) {
    const player = this.map.player(playerId);
    if (!player) throw new Error(`No player ${playerId}`);

    player.resolveGold();
  }

  private resolveTerritoryControl(territoryId: ID) {
    const territory = this.map.territory(territoryId);
    if (!territory) throw new Error(`No territory ${territoryId}`);

    const unresolveTerritory = this.unresolvedMap.territory(territoryId);

    territory.resolveTerritoryControl(unresolveTerritory);
  }

  private resolveTerritoryAction(territoryId: ID) {
    const territory = this.map.territory(territoryId);
    if (!territory) throw new Error(`No territory ${territoryId}`);

    territory.resolveTerritoryAction();
  }

  private toMovesState() {
    this.resolveIds = this.map.units.filter(unit => unit.data.destinationId).map(unit => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter(unitId => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach(unitId => this.resolveMove(unitId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.MOVES;
  }

  private toEdgeMovesState() {
    this.resolveIds = this.map.units.filter(unit => unit.data.destinationId && !unit.location.hasCombat()).map(unit => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter(unitId => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach(unitId => this.resolveMove(unitId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.EDGE_MOVES;
  }

  private toCombatsState() {
    this.resolveIds = this.map.getCombats().map(combat => combat.location.data.id);

    const invisibleResolveIds = this.resolveIds.filter(locationId => !this.isLocationVisible(locationId));
    invisibleResolveIds.forEach(locationId => this.resolveCombat(locationId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.COMBATS;
  }

  private toAddDefendState() {
    this.resolveIds = this.map.units.filter(unit => !contains(unit.data.statuses, Status.DEFEND)).map(unit => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter(unitId => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach(unitId => this.resolveAddDefend(unitId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.ADD_DEFEND;
  }

  private toGoldState() {
    this.resolveIds = clone(this.map.data.playerIds);
    this.resolveState = ResolveState.GOLD;
  }

  private toFoodState() {
    this.resolveIds = clone(this.map.data.territoryIds);

    const invisibleResolveIds = this.resolveIds.filter(territoryId => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach(territoryId => this.resolveFood(territoryId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.FOOD;
  }

  private toTerritoryControlState() {
    this.resolveIds = clone(this.map.data.territoryIds);

    const invisibleResolveIds = this.resolveIds.filter(territoryId => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach(territoryId => this.resolveTerritoryControl(territoryId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.TERRITORY_CONTROL;
  }

  private toTerritoryActionState() {
    this.resolveIds = this.map.territories.filter(territory => territory.data.currentAction != null).map(territory => territory.data.id);

    const invisibleResolveIds = this.resolveIds.filter(territoryId => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach(territoryId => this.resolveTerritoryAction(territoryId));
    this.resolveIds = excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.TERRITORY_ACTIONS;
  }

  public isUnitVisible(unitId: ID): boolean {
    const model = this.map.unit(unitId);
    const locationVisibility = this.visibility.get(model.location.data.id);
    let visible = locationVisibility;

    // when in replay mode, units are visible if they occupy a visible location OR occupy a currently visible location NEXT turn
    if (this.isReplaying && model.data.destinationId) {
      const futureModel = new GameMap(this.game.data.maps[this.turn]).unit(unitId);
      if (futureModel) {
        const futureLocationVisibility = this.visibility.get(futureModel.location.data.id);
        visible = locationVisibility || futureLocationVisibility;
      }
    }

    return visible;
  }

  public isLocationVisible(locationId): boolean {
    return this.visibility.get(locationId);
  }
}
