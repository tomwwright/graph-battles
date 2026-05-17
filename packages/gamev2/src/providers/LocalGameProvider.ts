import { Game, GameMap } from '@battles/models';
import type { Actions, GameData, ID } from '@battles/models';
import { unwrapV2MapText } from '@battles/api/client';
import type { StoredViewData } from '@battles/api/client';
import type { GameProvider } from './GameProvider';

type SavedGame = {
  gameData: GameData;
  viewData: StoredViewData;
  lastUpdated: number;
};

const KEY_PREFIX = 'graph-battles-';

/**
 * localStorage-backed provider. Reads/writes the same keys as the lobby's
 * `services/local-storage.ts` so games created in the lobby load here.
 *
 * Hot-seat: when all players ready, the turn resolves synchronously
 * (matches v1 LocalGameProvider).
 */
export class LocalGameProvider implements GameProvider {
  constructor(private readonly gameId: string, _userId: string) {
    void _userId;
  }

  async get(): Promise<Game> {
    return new Game(this.load().gameData);
  }

  async action(_playerId: ID, action: Actions.ModelAction): Promise<Game> {
    const saved = this.load();
    const game = new Game(saved.gameData);
    const map = new GameMap(game.latestMap);
    map.applyAction(action);
    if (action.type === 'ready-player' && map.players.every((p) => p.ready)) {
      game.resolveTurn();
    }
    saved.gameData = game.data;
    saved.lastUpdated = Date.now();
    this.save(saved);
    return game;
  }

  async getMapText(): Promise<string> {
    try {
      return unwrapV2MapText(this.load().viewData);
    } catch (e) {
      console.error(
        `[LocalGameProvider] Cannot load gameId=${this.gameId} in gamev2: view data is not v2`,
        e,
      );
      throw e;
    }
  }

  /**
   * Local play resolves the turn synchronously inside `action()` — by the time
   * the orchestrator awaits this, the persisted game state already has the
   * advanced turn. Reads localStorage and returns it. Throws if not advanced
   * (i.e. all-ready not yet reached).
   */
  async waitForTurn(currentTurn: number, _signal?: AbortSignal): Promise<Game> {
    void _signal;
    const game = new Game(this.load().gameData);
    if (game.turn > currentTurn) return game;
    throw new Error(`LocalGameProvider: turn ${currentTurn} not yet resolved`);
  }

  private load(): SavedGame {
    const raw = window.localStorage.getItem(KEY_PREFIX + this.gameId);
    if (!raw) throw new Error(`Game '${this.gameId}' not in localStorage`);
    return JSON.parse(raw) as SavedGame;
  }

  private save(saved: SavedGame): void {
    window.localStorage.setItem(KEY_PREFIX + this.gameId, JSON.stringify(saved));
  }
}
