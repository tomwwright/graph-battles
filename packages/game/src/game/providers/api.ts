import Axios, { AxiosError } from 'axios';
import { GameProvider } from 'game/providers/base';
import { Actions, Game, GameData, GameMap } from '@battles/models';
import { LocalGameProvider } from './local';
import { ViewData } from 'game/stores/phaser';

type PlayerActionRecord = {
  actions: Actions.ModelAction[];
  updatedAt: number;
};

const BATTLES_API_HOSTNAME = 'https://18vjoshjme.execute-api.ap-southeast-2.amazonaws.com';

export class APIGameProvider extends GameProvider {
  localGameProvider: LocalGameProvider;
  playerActionStorage: PlayerActionLocalStorage;

  cachedGameData: GameData;

  constructor(gameId: string, userId: string) {
    super(gameId, userId);

    this.localGameProvider = LocalGameProvider.createProvider(gameId, userId);
    this.playerActionStorage = new PlayerActionLocalStorage(gameId, userId);
  }

  public async get(): Promise<Game> {
    const gameResponse = await Axios.get(`${BATTLES_API_HOSTNAME}/game/${this.gameId}`);
    this.cachedGameData = gameResponse.data as GameData;

    const actions = await this.findLatestActions();

    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    for (const action of actions) {
      map.applyAction(action);
    }

    return game;
  }

  public async getViewData(): Promise<ViewData> {
    const viewResponse = await Axios.get(`${BATTLES_API_HOSTNAME}/game/${this.gameId}/view`);
    return viewResponse.data as ViewData;
  }

  public async action(action: Actions.ModelAction): Promise<Game> {
    this.playerActionStorage.addAction(action);
    if (action.type == 'ready-player') {
      await this.pushLatestActions();
    }
    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    map.applyAction(action);
    return game;
  }

  public wait(condition: (game: Game) => boolean): Promise<Game> {
    throw new Error('Method not implemented.');
  }

  private async pushLatestActions() {
    const actions = this.playerActionStorage.currentActions.actions;
    const response = await Axios.put(`${BATTLES_API_HOSTNAME}/game/${this.gameId}/actions/${this.userId}`, actions);

    if (response.status != 200) throw new Error(JSON.stringify(response));
  }

  private async findLatestActions(): Promise<Actions.ModelAction[]> {
    let apiActionsRecord: PlayerActionRecord;
    try {
      const apiActionsResponse = await Axios.get(`${BATTLES_API_HOSTNAME}/game/${this.gameId}/actions/${this.userId}`);
      apiActionsRecord = apiActionsResponse.data as PlayerActionRecord;
    } catch (e) {
      apiActionsRecord = {
        actions: [],
        updatedAt: 0,
      };
    }

    const localActionsRecord = this.playerActionStorage.currentActions;

    if (apiActionsRecord.updatedAt > localActionsRecord.updatedAt) {
      this.playerActionStorage.saveActions(apiActionsRecord.actions);
      return apiActionsRecord.actions;
    } else {
      return localActionsRecord.actions;
    }
  }
}

const KEY_PREFIX: string = 'graph-battles-actions-';

export class PlayerActionLocalStorage {
  gameId: string;
  playerId: string;

  static KEY_PREFIX: string = 'graph-battles-actions';

  constructor(gameId: string, playerId: string) {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    this.gameId = gameId;
    this.playerId = playerId;
  }

  addAction(action: Actions.ModelAction) {
    const currentActions = this.currentActions.actions;
    currentActions.push(action);
    this.saveActions(currentActions);
  }

  saveActions(actions: Actions.ModelAction[]) {
    const record: PlayerActionRecord = {
      actions,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(this.key, JSON.stringify(record));
  }

  get currentActions(): PlayerActionRecord {
    const value = window.localStorage.getItem(this.key);
    if (value === null)
      return {
        actions: [],
        updatedAt: 0,
      };
    const record: PlayerActionRecord = JSON.parse(value);
    return record;
  }

  private get key() {
    return `${KEY_PREFIX}-${this.gameId}-${this.playerId}`;
  }
}
