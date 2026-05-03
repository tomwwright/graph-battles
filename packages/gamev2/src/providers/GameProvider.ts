import type { Actions, Game } from '@battles/models';

/**
 * Provider abstraction for fetching game state and submitting actions.
 * Implementations: StubGameProvider (in-memory), LocalGameProvider (localStorage),
 * APIGameProvider (REST).
 */
export interface GameProvider {
  /** Pull current game state. Provider replays any pending local actions. */
  get(): Promise<Game>;
  /**
   * Notify the provider of a user action. Provider caches locally; on
   * `ready-player` the cached actions are pushed to the backing store.
   * Returns the locally-mutated Game.
   */
  action(action: Actions.ModelAction): Promise<Game>;
  /** Returns the v2 map text for `parseMap`. Throws if the stored view data is v1. */
  getMapText(): Promise<string>;
}
