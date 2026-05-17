import { GameMap } from '@battles/models';
import type { Game, ID } from '@battles/models';
import type { Phase, StoreState } from './types';

/**
 * Players this tab is allowed to control. Derived from `(game, userId)`:
 * with a userId set (remote play) → only that user's players; otherwise
 * (hot-seat / stub) → all players.
 *
 * Pure derivation — not stored in state.
 */
export function selectPlayablePlayerIds(state: StoreState): ID[] {
  return resolvePlayablePlayerIds(state.game, state.userId, state.map);
}

export function resolvePlayablePlayerIds(
  game: Game,
  userId: ID | undefined,
  map?: GameMap,
): ID[] {
  const fallbackPlayerIds = () => (map ?? new GameMap(game.latestMap)).playerIds;
  if (!userId) return fallbackPlayerIds();
  const user = game.users.find((u) => u.data.id === userId);
  if (!user) return fallbackPlayerIds();
  return user.players.map((p) => p.data.id);
}

/**
 * Player whose turn the UI should display. Phases that don't have a player
 * concept (waiting, victory) fall back to the first playable player, then to
 * the first player in the map. UI components should prefer this over reading
 * `phase.currentPlayerId` directly when they may render across phases.
 */
export function selectCurrentPlayerId(state: StoreState): ID | null {
  const fromPhase = currentPlayerIdFromPhase(state.phase);
  if (fromPhase) return fromPhase;
  return selectPlayablePlayerIds(state)[0] ?? state.map?.playerIds[0] ?? null;
}

export function currentPlayerIdFromPhase(phase: Phase): ID | null {
  switch (phase.type) {
    case 'planning':
    case 'next-player':
    case 'replaying':
      return phase.currentPlayerId;
    case 'waiting':
    case 'victory':
      return null;
  }
}
