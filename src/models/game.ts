import { GameMap } from "models/map";
import { User, UserData, createUser } from "models/user";

export type GameData = {
  id: string;
  maxTurns: number;
  maxVictoryPoints: number;
  maps: GameMap[];
  users: UserData[];
};

export type Game = {
  data: GameData;
  turn: number;
  nextId: number;
  latestMap: GameMap;
  users: User[];
};

export function createGame(data: GameData): Game {
  const game: Game = {
    get turn() {
      return game.data.maps.length;
    },
    get nextId() {
      return game.latestMap.data.nextId;
    },
    get latestMap() {
      return game.data.maps[game.data.maps.length - 1];
    },
    data,
    users: data.users.map(userData => createUser(game, userData))
  };
  return game;
}
