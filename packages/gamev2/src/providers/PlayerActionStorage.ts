import type { Actions } from '@battles/models';
import type { PlayerActionRecord } from '@battles/api/client';

const KEY_PREFIX = 'graph-battles-v2-actions';

/**
 * Per-(gameId, userId) cache of pending actions in localStorage.
 * Mirrors v1 PlayerActionLocalStorage but uses a v2-specific key prefix
 * so v1 and v2 caches for the same gameId do not collide.
 */
export class PlayerActionStorage {
  constructor(private readonly gameId: string, private readonly userId: string) {}

  addAction(action: Actions.ModelAction): void {
    const next = this.currentActions.actions;
    next.push(action);
    this.saveActions(next);
  }

  saveActions(actions: Actions.ModelAction[]): void {
    const record: PlayerActionRecord = { actions, updatedAt: Date.now() };
    window.localStorage.setItem(this.key, JSON.stringify(record));
  }

  get currentActions(): PlayerActionRecord {
    const raw = window.localStorage.getItem(this.key);
    if (raw === null) return { actions: [], updatedAt: 0 };
    return JSON.parse(raw) as PlayerActionRecord;
  }

  private get key(): string {
    return `${KEY_PREFIX}-${this.gameId}-${this.userId}`;
  }
}
