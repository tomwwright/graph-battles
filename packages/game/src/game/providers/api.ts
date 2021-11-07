import Axios, { AxiosError } from 'axios';
import { GameProvider } from 'game/providers/base';
import { Actions, Game, GameData, GameMap } from '@battles/models';
import { ViewData } from 'game/stores/phaser';

type PlayerActionRecord = {
  actions: Actions.ModelAction[];
  updatedAt: number;
};

export class APIGameProvider extends GameProvider {
  playerActionStorage: PlayerActionLocalStorage;
  gameApi: GameAPI;

  cachedGameData: GameData;

  constructor(gameId: string, userId: string) {
    super(gameId, userId);

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

    /* Because the GameProvider works on the userId instead of the playerId, look up playerId from the actions */
    const readyAction = actions.find((action) => action.type === 'ready-player') as Actions.ReadyPlayerModelAction;
    if (!readyAction) {
      throw new Error('Attempting to push actions to API without a ready action!');
    }
    console.log(`Pushing actions for playerId: ${readyAction.playerId}`);
    await this.gameApi.putPlayerActions(this.gameId, readyAction.playerId, actions);
    this.playerActionStorage.saveActions([]);
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

export class PlayerActionLocalStorage {
  gameId: string;
  userId: string;

  static KEY_PREFIX: string = 'graph-battles-actions';

  constructor(gameId: string, userId: string) {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    this.gameId = gameId;
    this.userId = userId;
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
    return `${PlayerActionLocalStorage.KEY_PREFIX}-${this.gameId}-${this.userId}`;
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

  async createGame(gameData: GameData, viewData: ViewData) {
    const gameResponse = await Axios.put(`${this.endpoint}/game`, gameData);
    if (gameResponse.status != 200) throw new Error(JSON.stringify(gameResponse));

    const viewResponse = await Axios.put(`${this.endpoint}/game/${gameData.id}/view`, viewData);
    if (viewResponse.status != 200) throw new Error(JSON.stringify(viewResponse));
  }

  async listGames(): Promise<GameSummary[]> {
    const response = await Axios.get(`${this.endpoint}/game/_all`);
    return response.data as GameSummary[];
  }

  async getViewData(gameId: string): Promise<ViewData> {
    const url = `${this.endpoint}/game/${gameId}/view`;
    const viewResponse = await Axios.get(url);
    return viewResponse.data as ViewData;
  }

  async getGameData(gameId: string): Promise<GameData> {
    const url = `${this.endpoint}/game/${gameId}`;
    const gameResponse = await Axios.get(url);
    return gameResponse.data as GameData;
  }

  async getPlayerActions(gameId, playerId): Promise<PlayerActionRecord> {
    const url = `${this.endpoint}/game/${gameId}/actions/${encodeURIComponent(playerId)}`;
    const apiActionsResponse = await Axios.get(url);
    return apiActionsResponse.data as PlayerActionRecord;
  }

  async putPlayerActions(gameId, playerId, actions) {
    const url = `${this.endpoint}/game/${gameId}/actions/${encodeURIComponent(playerId)}`;
    const response = await Axios.put(url, actions);
    if (response.status != 200) throw new Error(JSON.stringify(response));
  }
}
