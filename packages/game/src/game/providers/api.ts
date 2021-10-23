import Axios, { AxiosError } from 'axios';
import { GameProvider } from 'game/providers/base';
import { Actions, Game, GameData, GameMap } from '@battles/models';
import { LocalGameProvider } from './local';
import { ViewData } from 'game/stores/phaser';

type PlayerActionRecord = {
  actions: Actions.ModelAction[];
  updatedAt: number;
};

export class APIGameProvider extends GameProvider {
  localGameProvider: LocalGameProvider;
  playerActionStorage: PlayerActionLocalStorage;
  gameApi: GameAPI;

  cachedGameData: GameData;

  constructor(gameId: string, userId: string) {
    super(gameId, userId);

    this.localGameProvider = LocalGameProvider.createProvider(gameId, userId);
    this.playerActionStorage = new PlayerActionLocalStorage(gameId, userId);
    this.gameApi = new GameAPI();
  }

  public async get(): Promise<Game> {
    this.cachedGameData = await this.gameApi.getGameData(this.gameId);

    const actions = await this.findLatestActions();

    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    for (const action of actions) {
      map.applyAction(action);
    }

    return game;
  }

  public async getViewData(): Promise<ViewData> {
    return this.gameApi.getViewData(this.gameId);
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
    const playerId = this.userId; // the API provider expects that user id == player id
    await this.gameApi.putPlayerActions(this.gameId, playerId, actions);
  }

  private async findLatestActions(): Promise<Actions.ModelAction[]> {
    let apiActionsRecord: PlayerActionRecord;
    try {
      apiActionsRecord = await this.gameApi.getPlayerActions(this.gameId, this.userId);
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

export type GameSummary = {
  gameId: string;
  turn: number;
  maxTurns: number;
  maxVictoryPoints: number;
  numTerritories: number;
  finished: boolean;
  leaderboard: {
    name: string;
    victoryPoints: number;
  }[];
  updatedAt: number;
};

export class GameAPI {
  static BATTLES_API_HOSTNAME = 'https://18vjoshjme.execute-api.ap-southeast-2.amazonaws.com';

  endpoint: string;

  constructor() {
    this.endpoint = GameAPI.BATTLES_API_HOSTNAME;
  }

  async listGames(): Promise<GameSummary[]> {
    const response = await Axios.get(`${this.endpoint}/game/_all`);
    return response.data as GameSummary[];
  }

  async getViewData(gameId: string): Promise<ViewData> {
    const viewResponse = await Axios.get(`${this.endpoint}/game/${gameId}/view`);
    return viewResponse.data as ViewData;
  }

  async getGameData(gameId: string): Promise<GameData> {
    const gameResponse = await Axios.get(`${this.endpoint}/game/${gameId}`);
    return gameResponse.data as GameData;
  }

  async getPlayerActions(gameId, playerId): Promise<PlayerActionRecord> {
    const apiActionsResponse = await Axios.get(`${this.endpoint}/game/${gameId}/actions/${playerId}`);
    return apiActionsResponse.data as PlayerActionRecord;
  }

  async putPlayerActions(gameId, playerId, actions) {
    const response = await Axios.put(`${this.endpoint}/game/${gameId}/actions/${playerId}`, actions);
    if (response.status != 200) throw new Error(JSON.stringify(response));
  }
}
