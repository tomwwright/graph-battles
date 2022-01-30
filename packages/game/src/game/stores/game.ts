import { observable, action, computed } from 'mobx';
import PhaserStore from 'game/stores/phaser';
import { GameProvider } from 'game/providers/base';
import { Actions, Game, GameData, GameMap, GameMapData, ID, Player, Territory, Utils, Values } from '@battles/models';

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER,
}

export enum ResolveState {
  START = 'start',
  NONE = 'none',
  MOVES = 'moves',
  EDGE_MOVES = 'edge-moves',
  COMBATS = 'combats',
  ADD_DEFEND = 'add-defend',
  GOLD = 'gold',
  FOOD = 'food',
  TERRITORY_CONTROL = 'territory-control',
  TERRITORY_ACTIONS = 'territory-actions',
}

export default class GameStore {
  phaserStore: PhaserStore;
  provider: GameProvider;

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

      territories.forEach((territory) => visibility.set(territory.data.id, false));
      edges.forEach((edge) => visibility.set(edge.data.id, false));

      const player = this.map.player(this.currentPlayerId);
      if (player) {
        const playerPresentTerritories = Utils.flat([
          player.territories,
          player.units
            .map((unit) => unit.location)
            .filter((location) => location.data.type == 'territory') as Territory[],
        ]);
        for (const territory of playerPresentTerritories) {
          visibility.set(territory.data.id, true);
          territory.edges.map((edge) => edge.other(territory).data.id).forEach((id) => visibility.set(id, true));
        }
        for (const edge of edges) {
          if (visibility.get(edge.data.territoryAId) && visibility.get(edge.data.territoryBId)) {
            visibility.set(edge.data.id, true);
          }
        }
      }
    } else {
      const isVisible = this.visibilityMode == VisibilityMode.VISIBLE;
      this.map.territories.forEach((territory) => visibility.set(territory.data.id, isVisible));
      this.map.edges.forEach((territory) => visibility.set(territory.data.id, isVisible));
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
  private setMap(mapData: GameMapData) {
    this.map = new GameMap(mapData);
  }

  @action
  setCurrentPlayer(playerId: ID) {
    this.currentPlayerId = playerId;
  }

  @action
  setTurn(turn: number) {
    if (turn < 1 || turn > this.game.data.maps.length) throw new Error(`Invalid turn number: ${turn}`);
    this.turn = turn;
    if (this.isReplaying) {
      this.setMap(Utils.clone(this.game.data.maps[turn - 1]));
      this.unresolvedMap = new GameMap(Utils.clone(this.game.data.maps[turn - 1]));
      this.resolveState = ResolveState.START;
      this.changeResolveState();
    } else {
      this.setMap(this.game.data.maps[turn - 1]); // don't clone, we need to apply model actions to the real copy!
      this.unresolvedMap = null;
      this.resolveIds = [];
      this.resolveState = ResolveState.NONE;
    }
  }

  @action
  private async applyModelAction(action: Actions.ModelAction) {
    const game = await this.provider.action(action);
    this.setGame(game.data);
    this.setMap(Utils.clone(game.latestMap));
  }

  @action
  async onTerritoryAction(territory: Territory, action: Values.TerritoryAction) {
    const modelAction: Actions.TerritoryModelAction = {
      type: 'territory',
      playerId: territory.data.playerId,
      territoryId: territory.data.id,
      action: action,
    };
    await this.applyModelAction(modelAction);
  }

  @action
  async onMoveUnits(unitIds: ID[], territoryId: ID) {
    for (const unitId of unitIds) {
      await this.applyModelAction({
        type: 'move-unit',
        playerId: this.currentPlayerId,
        destinationId: territoryId,
        unitId: unitId,
      } as Actions.MoveUnitModelAction);
    }
  }

  @action
  async onReadyPlayer(isReady: boolean) {
    await this.applyModelAction({
      type: 'ready-player',
      playerId: this.currentPlayerId,
    });
  }

  @action
  resolve(id: ID) {
    if (!Utils.contains(this.resolveIds, id)) throw new Error(`ID ${id} not a valid resolve ID!`);

    this.resolveIds = Utils.exclude(this.resolveIds, id);

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
      this.changeResolveState();
    }

    this.setMap(this.map.data);
  }

  private changeResolveState() {
    switch (this.resolveState) {
      case ResolveState.START:
        this.toMovesState();
        break;
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

    if (this.resolveState != ResolveState.NONE && this.resolveIds.length == 0) {
      this.changeResolveState();
    }
  }

  private resolveMove(unitId: ID) {
    const unit = this.map.unit(unitId);
    if (!unit) throw new Error(`No unit ${unitId}`);

    unit.resolveRemoveDefendStatus();
    unit.resolveMove();
  }

  private resolveCombat(locationId: ID) {
    const combat = this.map.getCombats().find((combat) => combat.location.data.id === locationId);
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
    this.resolveIds = this.map.units.filter((unit) => !!unit.moveAction).map((unit) => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter((unitId) => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach((unitId) => this.resolveMove(unitId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.MOVES;
  }

  private toEdgeMovesState() {
    this.resolveIds = this.map.units
      .filter((unit) => unit.moveAction && !unit.location.hasCombat())
      .map((unit) => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter((unitId) => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach((unitId) => this.resolveMove(unitId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.EDGE_MOVES;
  }

  private toCombatsState() {
    this.resolveIds = this.map.getCombats().map((combat) => combat.location.data.id);

    const invisibleResolveIds = this.resolveIds.filter((locationId) => !this.isLocationVisible(locationId));
    invisibleResolveIds.forEach((locationId) => this.resolveCombat(locationId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.COMBATS;
  }

  private toAddDefendState() {
    this.resolveIds = this.map.units
      .filter((unit) => !Utils.contains(unit.data.statuses, Values.Status.DEFEND))
      .map((unit) => unit.data.id);

    const invisibleResolveIds = this.resolveIds.filter((unitId) => !this.isUnitVisible(unitId));
    invisibleResolveIds.forEach((unitId) => this.resolveAddDefend(unitId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.ADD_DEFEND;
  }

  private toGoldState() {
    this.resolveIds = Utils.clone(this.map.players.map((player) => player.data.id));
    this.resolveState = ResolveState.GOLD;
  }

  private toFoodState() {
    this.resolveIds = Utils.clone(this.map.territories.map((territory) => territory.data.id));

    const invisibleResolveIds = this.resolveIds.filter((territoryId) => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach((territoryId) => this.resolveFood(territoryId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.FOOD;
  }

  private toTerritoryControlState() {
    this.resolveIds = Utils.clone(this.map.territories.map((territory) => territory.data.id));

    const invisibleResolveIds = this.resolveIds.filter((territoryId) => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach((territoryId) => this.resolveTerritoryControl(territoryId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.TERRITORY_CONTROL;
  }

  private toTerritoryActionState() {
    this.resolveIds = this.map.territories
      .filter((territory) => territory.action != null)
      .map((territory) => territory.data.id);

    const invisibleResolveIds = this.resolveIds.filter((territoryId) => !this.isLocationVisible(territoryId));
    invisibleResolveIds.forEach((territoryId) => this.resolveTerritoryAction(territoryId));
    this.resolveIds = Utils.excludeAll(this.resolveIds, invisibleResolveIds);

    this.resolveState = ResolveState.TERRITORY_ACTIONS;
  }

  public isUnitVisible(unitId: ID): boolean {
    const model = this.map.unit(unitId);
    const locationVisibility = this.visibility.get(model.location.data.id);
    let visible = locationVisibility;

    // when in replay mode, units are visible if they occupy a visible location OR occupy a currently visible location NEXT turn
    if (this.isReplaying && model.moveAction) {
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
