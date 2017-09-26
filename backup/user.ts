import { ID, HasID } from "models/utils";
import { Game } from "models/game";
import { Player } from "models/player";

export type UserData = HasID & {
  name: string;
  playerIds: ID[];
};

export type User = UserData & {
  players: Player[];
};

export function createUser(game: Game, data: UserData): User {
  const user: User = {
    get players(this: User) {
      return this.playerIds.map(id => game.latestMap.players.find(player => player.id === id));
    },
    ...data
  };
  return user;
}
