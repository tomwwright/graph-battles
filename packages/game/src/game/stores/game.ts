import { observable, action, computed } from 'mobx';
import PhaserStore from 'game/stores/phaser';
import { GameProvider } from 'game/providers/base';
import { Actions, Game, GameData, GameMap, GameMapData, ID, Player, Resolution, Territory, Utils, Values, resolveTurn } from '@battles/models';

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER,
}

export default class GameStore {
  phaserStore: PhaserStore;
  provider: GameProvider;

  @observable.ref game: Game;
  @observable.ref map: GameMap = null;
  @observable.ref generator: Generator<Resolution> | null = null;
  @observable.ref currentResolution: Resolution | null = null;

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
  get isResolutionComplete() {
    return this.isReplaying && this.generator === null;
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
      this.generator = resolveTurn(this.map);
      this.currentResolution = null;
      this.advanceToNextVisible();
    } else {
      this.setMap(this.game.data.maps[turn - 1]); // don't clone, we need to apply model actions to the real copy!
      this.generator = null;
      this.currentResolution = null;
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
      territoryId: territory.data.id,
      action: action,
    };
    await this.applyModelAction(modelAction);
  }

  @action
  async onMoveUnits(unitIds: ID[], territoryId: ID) {
    await this.applyModelAction({
      type: 'move-units',
      playerId: this.currentPlayerId,
      destinationId: territoryId,
      unitIds: unitIds,
    } as Actions.MoveUnitsModelAction);
  }

  @action
  async onReadyPlayer(isReady: boolean) {
    await this.applyModelAction({
      type: 'ready-player',
      playerId: this.currentPlayerId,
      isReady: isReady,
    });
  }

  @action
  resolveNext() {
    if (!this.generator) return;
    // advanceToNextVisible calls gen.next() which applies currentResolution then finds the next visible step
    this.advanceToNextVisible();
    this.setMap(this.map.data);
  }

  public isUnitVisible(unitId: ID): boolean {
    const unit = this.map.unit(unitId);
    if (!unit) return false;

    const locationVisible = this.visibility.get(unit.location.data.id) ?? false;

    // Also consider destination: show a move if the unit is heading to or from a visible area
    if (unit.destinationId) {
      const destinationVisible = this.visibility.get(unit.destinationId) ?? false;
      return locationVisible || destinationVisible;
    }

    return locationVisible;
  }

  public isLocationVisible(locationId: ID): boolean {
    return this.visibility.get(locationId) ?? false;
  }

  private isResolutionVisible(resolution: Resolution): boolean {
    switch (resolution.phase) {
      case 'move':
      case 'add-defend':
        return this.isUnitVisible(resolution.unitId);
      case 'combat':
        return this.isLocationVisible(resolution.locationId);
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return this.isLocationVisible(resolution.territoryId);
      case 'gold':
        return true;
    }
  }

  private advanceToNextVisible() {
    while (true) {
      const { value, done } = this.generator.next();
      if (done) {
        this.generator = null;
        this.currentResolution = null;
        return;
      }
      if (this.isResolutionVisible(value)) {
        this.currentResolution = value;
        return;
      }
      // Invisible — the step was yielded and will be applied on the next .next() call,
      // but we're calling .next() in the next loop iteration, which applies it. Correct.
    }
  }
}
