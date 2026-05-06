import type { Actions, Game, ID } from '@battles/models';

/**
 * Provider abstraction for fetching game state and submitting actions.
 * Implementations: StubGameProvider (in-memory), LocalGameProvider (localStorage),
 * APIGameProvider (REST).
 */
export interface GameProvider {
  /** Pull current game state. Provider replays any pending local actions. */
  get(): Promise<Game>;
  /**
   * Notify the provider of a player action. Providesrcaches locally; on
   * `ready-player` the cached actions for that playerId are
   * pushed to the backing store. Returns the locally-mutated Game.
   */
  action(playerId: ID, action: Actions.ModelAction): Promise<Game>;
  /** Returns the v2 map text for `parseMap`. Throws if the stored view data is v1. */
  getMapText(): Promise<string>;
  /**
   * Resolves with the new Game once turn resolution has advanced past
   * `currentTurn`. For local providers this is checked once against persisted
   * state; for remote it polls until the server publishes a resolved turn.
   * Throws if no resolution is available and the provider has no way to wait
   * (e.g. stub).
   */
  waitForTurn(currentTurn: number): Promise<Game>;
}
