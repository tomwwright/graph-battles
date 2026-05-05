import { Game, GameMap } from '@battles/models';
import type { Actions, GameData } from '@battles/models';
import { GameApiClient, unwrapV2MapText } from '@battles/api/client';
import type { GameProvider } from './GameProvider';
import { PlayerActionStorage } from './PlayerActionStorage';

const POLL_INTERVAL_MS = 10_000;

export class APIGameProvider implements GameProvider {
  private readonly storage: PlayerActionStorage;
  private readonly api: GameApiClient;
  private cachedGameData: GameData | null = null;

  constructor(
    private readonly gameId: string,
    private readonly userId: string,
    api?: GameApiClient,
  ) {
    this.api = api ?? new GameApiClient();
    this.storage = new PlayerActionStorage(gameId, userId);
  }

  async get(): Promise<Game> {
    this.cachedGameData = await this.api.getGameData(this.gameId);
    const actions = await this.findLatestActions();
    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    for (const action of actions) map.applyAction(action);
    return game;
  }

  async action(action: Actions.ModelAction): Promise<Game> {
    if (!this.cachedGameData) throw new Error('action() called before get()');
    this.storage.addAction(action);
    if (action.type === 'ready-player') await this.pushLatestActions();
    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    map.applyAction(action);
    return game;
  }

  async getMapText(): Promise<string> {
    const stored = await this.api.getViewData(this.gameId);
    try {
      return unwrapV2MapText(stored);
    } catch (e) {
      console.error(
        `[APIGameProvider] Cannot load gameId=${this.gameId} in gamev2: view data is not v2`,
        e,
      );
      throw e;
    }
  }

  private async pushLatestActions(): Promise<void> {
    const actions = this.storage.currentActions.actions;
    const ready = actions.find(
      (a) => a.type === 'ready-player',
    ) as Actions.ReadyPlayerModelAction | undefined;
    if (!ready) throw new Error('Pushing actions without a ready action');
    await this.api.putPlayerActions(this.gameId, ready.playerId, actions);
    this.storage.saveActions([]);
  }

  /**
   * Polls `get()` every POLL_INTERVAL_MS until `game.turn > currentTurn`,
   * then resolves with the new Game.
   */
  async waitForTurn(currentTurn: number): Promise<Game> {
    while (true) {
      try {
        const game = await this.get();
        if (game.turn > currentTurn) return game;
      } catch (e) {
        console.warn('[APIGameProvider] resolution poll failed:', e);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  private async findLatestActions(): Promise<Actions.ModelAction[]> {
    const apiRecord = await this.api.getPlayerActions(this.gameId, this.userId);
    const localRecord = this.storage.currentActions;
    if (apiRecord.updatedAt > localRecord.updatedAt) {
      this.storage.saveActions(apiRecord.actions);
      return apiRecord.actions;
    }
    return localRecord.actions;
  }
}
