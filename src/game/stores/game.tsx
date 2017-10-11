import { observable, action, computed } from "mobx";
import { ID } from "models/utils";
import GameMap, { GameMapData } from "models/map";
import Player from "models/player";
import Territory from "models/territory";
import { TerritoryAction } from "models/values";

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER
}

export default class GameStore {
  @observable.ref map: GameMap;
  @observable currentPlayerId: ID;
  @observable visibility: Map<ID, boolean> = new Map();

  @computed
  get currentPlayer(): Player {
    return this.map.players.find(player => player.data.id === this.currentPlayerId);
  }

  @action
  setMap(mapData: GameMapData) {
    this.map = new GameMap(mapData);
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
  setTerritoryAction(territory: Territory, action: TerritoryAction) {
    territory.setTerritoryAction(action);
    this.setMap(this.map.data);
  }
}
