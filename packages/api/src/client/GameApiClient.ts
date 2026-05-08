import type { Actions, GameData } from '@battles/models';
import type {
  GameSummary,
  PlayerActionRecord,
  StoredViewData,
  VersionedViewData,
} from './types';

export const BATTLES_API_HOSTNAME =
  'https://dctg63fuac.execute-api.ap-southeast-2.amazonaws.com';

export class GameApiClient {
  private readonly endpoint: string;

  constructor(endpoint: string = BATTLES_API_HOSTNAME) {
    this.endpoint = endpoint;
  }

  async listGames(): Promise<GameSummary[]> {
    const res = await fetch(`${this.endpoint}/game/_all`);
    if (!res.ok) throw new Error(`listGames failed: ${res.status}`);
    return (await res.json()) as GameSummary[];
  }

  async getGameData(gameId: string): Promise<GameData> {
    const res = await fetch(`${this.endpoint}/game/${gameId}`);
    if (!res.ok) throw new Error(`getGameData failed: ${res.status}`);
    return (await res.json()) as GameData;
  }

  async createGame(gameData: GameData, viewData: VersionedViewData): Promise<void> {
    const g = await fetch(`${this.endpoint}/game`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });
    if (!g.ok) throw new Error(`createGame (game) failed: ${g.status}`);

    const v = await fetch(`${this.endpoint}/game/${gameData.id}/view`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viewData),
    });
    if (!v.ok) throw new Error(`createGame (view) failed: ${v.status}`);
  }

  async getViewData(gameId: string): Promise<StoredViewData> {
    const res = await fetch(`${this.endpoint}/game/${gameId}/view`);
    if (!res.ok) throw new Error(`getViewData failed: ${res.status}`);
    return (await res.json()) as StoredViewData;
  }

  async getPlayerActions(gameId: string, playerId: string): Promise<PlayerActionRecord> {
    const res = await fetch(
      `${this.endpoint}/game/${gameId}/actions/${encodeURIComponent(playerId)}`,
    );
    if (res.status === 404) return { actions: [], updatedAt: 0 };
    if (!res.ok) throw new Error(`getPlayerActions failed: ${res.status}`);
    return (await res.json()) as PlayerActionRecord;
  }

  async putPlayerActions(
    gameId: string,
    playerId: string,
    actions: Actions.ModelAction[],
  ): Promise<{ resolved: boolean }> {
    const res = await fetch(
      `${this.endpoint}/game/${gameId}/actions/${encodeURIComponent(playerId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actions),
      },
    );
    if (!res.ok) throw new Error(`putPlayerActions failed: ${res.status}`);
    return (await res.json()) as { resolved: boolean };
  }
}
