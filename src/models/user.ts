import { ID, HasID, IDInstance } from "models/utils";
import { Game } from "models/game";
import { Player } from "models/player";

export type UserData = HasID & {
  name: string;
  playerIds: ID[];
};

export type User = IDInstance & {
  data: UserData;
  players: Player[];
};

export function createUser(game: Game, data: UserData): User {
  const user: User = {
    get players(this: User) {
      return this.data.playerIds.map(id => game.latestMap.players.find(player => player.data.id === id));
    },
    data
  };
  return user;
}
