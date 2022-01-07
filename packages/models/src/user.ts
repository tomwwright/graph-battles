import { ID, HasID } from './utils';
import { Game } from './game';
import { PlayerData } from './player';
import { GameMap } from '.';

export type UserData = HasID & {
  name: string;
  type: 'user';
  playerIds: ID[];
};

export class User {
  data: UserData;
  game: Game;

  constructor(game: Game, data: UserData) {
    this.data = data;
    this.game = game;
  }

  get players() {
    const map = new GameMap(this.game.latestMap);
    return map.players.filter((player) => this.data.playerIds.includes(player.data.id));
  }
}
