import GameMap from "models/map";
import User, { UserData } from "models/user";
import { clone } from "models/utils";

export type GameData = {
  id: string;
  maxTurns: number;
  maxVictoryPoints: number;
  maps: GameMap[];
  users: UserData[];
};

export default class Game {
  data: GameData;
  users: User[];

  constructor(data: GameData) {
    this.data = data;
    this.users = data.users.map(userData => new User(this, userData));
  }

  get turn() {
    return this.data.maps.length;
  }

  get nextId() {
    return this.latestMap.data.nextId;
  }

  get latestMap() {
    return this.data.maps[this.data.maps.length - 1];
  }

  resolveTurn() {
    const next = new GameMap(clone(this.latestMap.data));
    next.resolveTurn();
    this.data.maps.push(next);
  }
}
