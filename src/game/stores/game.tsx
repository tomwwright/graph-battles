import { observable, action } from "mobx";
import { ID } from "models/utils";
import { GameMap, GameMapData, createMap } from "models/map";
import { Territory, setTerritoryAction } from "models/territory";
import { TerritoryAction } from "models/values";

export enum VisibilityMode {
  VISIBLE,
  NOT_VISIBLE,
  CURRENT_PLAYER
}

export default class GameStore {
  @observable.ref map: GameMap;
  @observable visibility: Map<ID, boolean> = new Map();

  @action
  setMap(mapData: GameMapData) {
    this.map = createMap(mapData);
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
    setTerritoryAction(territory, action);
    this.setMap(this.map.data);
  }
}
