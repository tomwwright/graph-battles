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

  get winners() {
    return new GameMap(this.latestMap).winningPlayers(this.data.maxVictoryPoints, this.turn > this.data.maxTurns);
  }

  resolveTurn() {
    if (this.winners.length > 0)
      throw new Error('Unable to resolve turn -- game is in a completed state!');
    const next = new GameMap(clone(this.latestMap));
    next.resolveTurn();
    this.data.maps.push(next.data);
  }
}
