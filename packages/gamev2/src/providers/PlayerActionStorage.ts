import type { Actions, ID } from '@battles/models';
import type { PlayerActionRecord } from '@battles/api/client';

const KEY_PREFIX = 'graph-battles-v2-actions';

/**
 * Per-(gameId, playerId) cache of pending actions in localStorage.
 * Mirrors v1 PlayerActionLocalStorage but uses a v2-specific key prefix
 * so v1 and v2 caches for the same gameId do not collide. Keyed by playerId
 * (not userId) to match the API's per-player action endpoint.
 */
export class PlayerActionStorage {
  constructor(private readonly gameId: string) {}

  addAction(playerId: ID, action: Actions.ModelAction): void {
    const next = this.currentActions(playerId).actions;
    next.push(action);
    this.saveActions(playerId, next);
  }

  saveActions(playerId: ID, actions: Actions.ModelAction[]): void {
    const record: PlayerActionRecord = { actions, updatedAt: Date.now() };
    window.localStorage.setItem(this.key(playerId), JSON.stringify(record));
  }

  currentActions(playerId: ID): PlayerActionRecord {
    const raw = window.localStorage.getItem(this.key(playerId));
    if (raw === null) return { actions: [], updatedAt: 0 };
    return JSON.parse(raw) as PlayerActionRecord;
  }

  private key(playerId: ID): string {
    return `${KEY_PREFIX}-${this.gameId}-${playerId}`;
  }
}
