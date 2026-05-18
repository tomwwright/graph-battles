import { Game, GameMap } from '@battles/models';
import type { Actions, GameData, ID } from '@battles/models';
import { GameApiClient, unwrapV2MapText } from '@battles/api/client';
import type { GameProvider } from './GameProvider';
import { PlayerActionStorage } from './PlayerActionStorage';

const POLL_INTERVAL_MS = 10_000;

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort);
  });
}

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
    this.storage = new PlayerActionStorage(gameId);
  }

  async get(): Promise<Game> {
    this.cachedGameData = await this.api.getGameData(this.gameId);
    const game = new Game(this.cachedGameData);
    const map = new GameMap(game.latestMap);
    const playerIds = this.resolvePlayerIds(game);
    for (const playerId of playerIds) {
      const actions = await this.findLatestActions(playerId);
      for (const action of actions) map.applyAction(action);
    }
    return game;
  }

  async action(playerId: ID, action: Actions.ModelAction): Promise<Game> {
    if (!this.cachedGameData) throw new Error('action() called before get()');
    this.storage.addAction(playerId, action);
    if (action.type === 'ready-player') await this.pushLatestActions(playerId);
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

  /**
   * Polls `get()` every POLL_INTERVAL_MS until `game.turn > currentTurn`,
   * then resolves with the new Game. Honours `signal` — cancels both the
   * `get()` await window and the inter-poll sleep, rejecting with `AbortError`.
   */
  async waitForTurn(currentTurn: number, signal?: AbortSignal): Promise<Game> {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const game = await this.get();
        if (game.turn > currentTurn) return game;
      } catch (e) {
        console.warn('[APIGameProvider] resolution poll failed:', e);
      }
      await abortableSleep(POLL_INTERVAL_MS, signal);
    }
  }

  private async pushLatestActions(playerId: ID): Promise<void> {
    const actions = this.storage.currentActions(playerId).actions;
    await this.api.putPlayerActions(this.gameId, playerId, actions);
    this.storage.saveActions(playerId, []);
  }

  private async findLatestActions(playerId: ID): Promise<Actions.ModelAction[]> {
    const apiRecord = await this.api.getPlayerActions(this.gameId, playerId);
    const localRecord = this.storage.currentActions(playerId);
    if (apiRecord.updatedAt > localRecord.updatedAt) {
      this.storage.saveActions(playerId, apiRecord.actions);
      return apiRecord.actions;
    }
    return localRecord.actions;
  }

  /**
   * Players this user controls in the given game. The API caches actions
   * per-playerId, so we fetch and apply pending actions for each of the user's
   * players when re-hydrating game state.
   */
  private resolvePlayerIds(game: Game): ID[] {
    const user = game.users.find((u) => u.data.id === this.userId);
    return user ? user.players.map((p) => p.data.id) : [];
  }
}
