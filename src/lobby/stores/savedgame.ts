import { observable, action } from 'mobx';

import { LocalStorage, SavedGame, LocalGameProvider } from 'game/providers/local';

export class SavedGameStore {
  @observable games: SavedGame[] = [];

  constructor() {
    this.load();
  }

  @action
  delete(gameId: string) {
    LocalStorage.deleteGame(gameId);
    this.load();
  }

  @action
  save(game: SavedGame) {
    game.lastUpdated = Date.now();
    LocalStorage.saveGame(game);
    this.load();
  }

  @action
  load() {
    this.games = LocalStorage.listGames().sort((a, b) => b.lastUpdated - a.lastUpdated);
  }
}