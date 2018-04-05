import { observable, action } from 'mobx';

import { LocalStorage, SavedGame, LocalGameProvider } from 'game/providers/local';

export class SavedGameStore {
  @observable games: SavedGame[] = [];

  @action
  delete(gameId: string) {
    LocalStorage.deleteGame(gameId);
    this.load();
  }

  @action
  save(game: SavedGame) {
    game.lastUpdated = Date.now();
    LocalStorage.saveGame(game);
  }

  @action
  load() {
    this.games = LocalStorage.listGames();
  }
}