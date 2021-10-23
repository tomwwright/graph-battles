import { observable, action, runInAction } from 'mobx';

import { GameAPI, GameSummary } from 'game/providers/api';

export class RemoteGameStore {
  @observable games: GameSummary[] = [];
  gameApi: GameAPI;

  constructor() {
    this.gameApi = new GameAPI();
    this.load();
  }

  async load() {
    const summaries = (await this.gameApi.listGames()).sort((a, b) => b.updatedAt - a.updatedAt);
    runInAction(() => {
      this.games = summaries;
    });
  }
}
