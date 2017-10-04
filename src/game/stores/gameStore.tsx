import { observable } from "mobx";
import { GameMap } from "models/map";

export default class GameStore {
  @observable map: GameMap;
}
