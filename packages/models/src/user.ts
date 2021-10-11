import { ID, HasID, Model } from './utils';
import Game from './game';
import { PlayerData } from './player';

export type UserData = HasID & {
  name: string;
  playerIds: ID[];
};

export default class User {
  data: UserData;
  game: Game;

  constructor(game: Game, data: UserData) {
    this.data = data;
    this.game = game;
  }

  get players() {
    return this.data.playerIds.map((id) => this.game.latestMap.dataMap[id] as PlayerData);
  }
}
