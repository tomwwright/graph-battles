import GameMap, { GameMapData } from "models/map";
import User, { UserData } from "models/user";
import { clone } from "models/utils";

export type GameData = {
  id: string;
  maxTurns: number;
  maxVictoryPoints: number;
  maps: GameMapData[];
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
    return this.latestMap.nextId;
  }

  get latestMap() {
    return this.data.maps[this.data.maps.length - 1];
  }
}
