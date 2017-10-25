import { observable, action, computed } from 'mobx';
import PhaserStore from 'game/stores/phaser';
import GameProvider from 'game/providers/base';
import { ID, clone } from 'models/utils';
import Game, { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';
import UnitContainer from 'models/unitcontainer';
import Player from 'models/player';
import Territory from 'models/territory';
import { TerritoryAction } from 'models/values';
import { ModelAction } from 'models/actions';

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER,
}

export default class GameStore {
  phaserStore: PhaserStore;

  @observable.ref game: Game;
  @observable.ref mapIndex: number = 0;
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
  get map(): GameMap {
    return new GameMap(this.game.data.maps[this.mapIndex]);
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
          territory.edges.map(edge => edge.data.id).forEach(id => visibility.set(id, true));
          territory.edges.map(edge => edge.other(territory).data.id).forEach(id => visibility.set(id, true));
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
  resolveModelAction(action: ModelAction) {
    const map = new GameMap(this.game.latestMap);
    map.applyAction(action);
    if (action.type === 'ready-player' && map.players.every(player => player.data.ready)) {
      /* TODO bit of a hacky way to handle turn resolution here... */
      this.game.resolveTurn();
    }
    this.game = new Game(this.game.data);
  }

  @action
  resolveMoves() {
    this.map.resolveMoves();

    this.game = new Game(this.game.data);
  }

  @action
  resolveCombat(locationId: ID) {
    const combat = this.map.getCombats().find(combat => combat.location.data.id === locationId);
    if (!combat) throw new Error(`No combat on Location ${locationId}`);

    const removedUnits = combat.resolve();

    removedUnits.forEach(unit => {
      this.phaserStore.destroyUnit(unit.data.id);
    });

    this.game = new Game(this.game.data);
  }

  @action
  onTerritoryAction(territory: Territory, action: TerritoryAction) {
    this.resolveModelAction({
      type: 'territory',
      playerId: this.currentPlayerId,
      territoryId: territory.data.id,
      action: action,
    });
  }

  @action
  onMoveUnits(unitIds: ID[], territoryId: ID) {
    this.resolveModelAction({
      type: 'move-units',
      playerId: this.currentPlayerId,
      destinationId: territoryId,
      unitIds: unitIds,
    });
  }
}