import { observable, action } from "mobx";
import { ID } from "models/utils";
import { GameMap, GameMapData, createMap } from "models/map";

export default class GameStore {
  @observable map: GameMap;
  @observable visibility: Map<ID, boolean> = new Map();

  @action
  setMap(mapData: GameMapData) {
    this.map = createMap(mapData);
  }
}
