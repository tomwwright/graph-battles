import { GameMap } from '@battles/models';
import type { Game, ID } from '@battles/models';
import type { AnimationToken, Phase } from './types';

/**
 * State types named here describe the minimal subset of `StoreState` each
 * selector reads. Generic `<S extends ...State>` lets callers pass narrower
 * structural subsets — supports the "track what state each consumer reads"
 * convention without forcing every caller to widen to full `StoreState`.
 */

type PlayablePlayerIdsState = { game: Game; userId?: ID; map: GameMap };
type CurrentPlayerIdState = PlayablePlayerIdsState & { phase: Phase };
type AnimationsState = { pendingAnimations: AnimationToken[] };

/**
 * Players this tab is allowed to control. Derived from `(game, userId)`:
 * with a userId set (remote play) → only that user's players; otherwise
 * (hot-seat / stub) → all players.
 *
 * Pure derivation — not stored in state.
 */
export function selectPlayablePlayerIds<S extends PlayablePlayerIdsState>(state: S): ID[] {
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
export function selectCurrentPlayerId<S extends CurrentPlayerIdState>(state: S): ID | null {
  const fromPhase = currentPlayerIdFromPhase(state.phase);
  if (fromPhase) return fromPhase;
  return selectPlayablePlayerIds(state)[0] ?? state.map?.playerIds[0] ?? null;
}

/**
 * Three-tier fallback for "which player should be active now":
 *   1. The phase's carried `currentPlayerId` (planning / next-player / replaying).
 *   2. First playable player.
 *   3. First player in the map.
 *
 * Returns an ID always — assumes the map has at least one player. Used by
 * handlers that transition into a phase carrying a player id without wanting
 * to handle the empty case at each call site.
 *
 * Distinct from `selectCurrentPlayerId` which returns `ID | null` for UI
 * components that may render before the store is populated.
 */
export function selectResolvedCurrentPlayerId<S extends CurrentPlayerIdState>(state: S): ID {
  return (
    currentPlayerIdFromPhase(state.phase) ??
    selectPlayablePlayerIds(state)[0] ??
    state.map.playerIds[0]
  );
}

/** True when no animations are in flight. */
export function selectNoRunningAnimations<S extends AnimationsState>(state: S): boolean {
  return state.pendingAnimations.length === 0;
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
