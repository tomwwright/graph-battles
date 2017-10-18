import { observable, action, computed } from 'mobx';
import GameProvider from 'game/providers/base';
import { ID } from 'models/utils';
import Game, { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';
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
  @observable.ref game: Game;
  @observable.ref mapIndex: number = 0;
  @observable currentPlayerId: ID;
  @observable visibility: Map<ID, boolean> = new Map();

  provider: GameProvider;
  @observable pendingAction: ModelAction;

  @computed
  get currentPlayer(): Player {
    return this.map.players.find(player => player.data.id === this.currentPlayerId);
  }

  @computed
  get map(): GameMap {
    return new GameMap(this.game.data.maps[this.mapIndex]);
  }

  @action
  setGame(gameData: GameData) {
    this.game = new Game(gameData);
  }

  @action
  setVisibility(mode: VisibilityMode) {
    if (mode == VisibilityMode.CURRENT_PLAYER) {
    } else {
      const isVisible = mode == VisibilityMode.VISIBLE;
      this.map.territories.forEach(territory => this.visibility.set(territory.data.id, isVisible));
      this.map.edges.forEach(territory => this.visibility.set(territory.data.id, isVisible));
    }
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
