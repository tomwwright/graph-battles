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

  provider: GameProvider;
  @observable pendingAction: ModelAction;

  constructor(phaserStore: PhaserStore) {
    this.phaserStore = phaserStore;
  }

  @computed
  get currentPlayer(): Player {
    return this.map.players.find(player => player.data.id === this.currentPlayerId);
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
  async dispatchModelAction(action: ModelAction) {
    if (!this.pendingAction) {
      this.pendingAction = action;
      try {
        const newGame = await this.provider.action(action);
        this.setGame(newGame.data);
      } catch (e) {
        console.error(e);
      }
      this.pendingAction = null;
    }
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
    this.dispatchModelAction({
      type: 'territory',
      playerId: this.currentPlayerId,
      territoryId: territory.data.id,
      action: action,
    });
  }

  @action
  onMoveUnits(unitIds: ID[], territoryId: ID) {
    this.dispatchModelAction({
      type: 'move-units',
      playerId: this.currentPlayerId,
      destinationId: territoryId,
      unitIds: unitIds,
    });
  }
}
