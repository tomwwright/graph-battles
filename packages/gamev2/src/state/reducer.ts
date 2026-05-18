import { GameMap, Utils } from '@battles/models';
import {
  resolvePlayablePlayerIds,
  selectResolvedCurrentPlayerId,
} from './selectors';
import type { StateChange, StoreState } from './types';

/**
 * Pure reducer for `GameStore`. Maps a `StateChange` action onto the next
 * `StoreState`.
 *
 * Map-revision auto-bump: actions that replace `state.map` (and `map/mutated`,
 * which signals an in-place mutation) bump `mapRevision`. `GameMap` is mutated
 * in place, so the reference may not change — the revision counter is what
 * forces `useSyncExternalStore` selectors to re-run.
 */
export function reducer(state: StoreState, change: StateChange): StoreState {
  switch (change.type) {
    case 'init':
      return change.state;
    case 'map/mutated':
      return { ...state, mapRevision: (state.mapRevision ?? 0) + 1 };
    case 'turn/set': {
      if (change.turn < 1 || change.turn > state.game.turn) return state;
      const isReplay = change.turn < state.game.turn;
      const mapData = state.game.data.maps[change.turn - 1];
      // Clone past-turn snapshots so generator mutations don't poison
      // `game.data.maps[*]`. Current-turn map is the live snapshot.
      const map = new GameMap(isReplay ? Utils.clone(mapData) : mapData);
      const currentPlayerId = selectResolvedCurrentPlayerId(state);
      return {
        ...state,
        map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: change.turn,
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
        phase: isReplay
          ? { type: 'replaying', currentPlayerId }
          : { type: 'planning', currentPlayerId },
      };
    }
    case 'turn/resolved': {
      const turn = change.resolved.turn - 1; // start replaying the turn that just resolved
      const replayMap = new GameMap(
        Utils.clone(change.resolved.data.maps[turn - 1]),
      );
      return {
        ...state,
        game: change.resolved,
        map: replayMap,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn,
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
        phase: {
          type: 'replaying',
          currentPlayerId: selectResolvedCurrentPlayerId(state),
        },
      };
    }
    case 'replay/completed': {
      if (state.phase.type !== 'replaying') return state;
      const nextTurn = state.turn + 1;
      if (nextTurn < state.game.turn) {
        // More history to replay. Load next turn's pre-resolve snapshot and
        // stay in `replaying` — the listener observes the new map reference
        // and restarts the generator.
        const mapData = state.game.data.maps[nextTurn - 1];
        const nextSnapshot = new GameMap(Utils.clone(mapData));
        return {
          ...state,
          map: nextSnapshot,
          mapRevision: (state.mapRevision ?? 0) + 1,
          turn: nextTurn,
          selectedUnitIds: [],
          selectedTerritoryId: null,
          currentResolution: null,
          phase: { type: 'replaying', currentPlayerId: state.phase.currentPlayerId },
        };
      }
      // Reached current turn. Exit replay.
      const nextMap = new GameMap(state.game.latestMap);
      const playablePlayerIds = resolvePlayablePlayerIds(state.game, state.userId, nextMap);
      const winners = nextMap.winningPlayers(
        state.game.data.maxVictoryPoints,
        state.game.turn > state.game.data.maxTurns,
      );
      const common = {
        ...state,
        map: nextMap,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: state.game.turn,
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
      };
      return winners.length > 0
        ? { ...common, phase: { type: 'victory' as const } }
        : {
          ...common,
          phase: {
            type: 'next-player' as const,
            currentPlayerId: playablePlayerIds[0] ?? nextMap.playerIds[0],
          },
        };
    }
    case 'wait-for-turn/failed': {
      if (state.phase.type !== 'waiting') return state;
      return {
        ...state,
        phase: {
          type: 'planning',
          currentPlayerId: selectResolvedCurrentPlayerId(state),
        },
      };
    }
    case 'phase/set':
      return { ...state, phase: change.phase };
    case 'selection/units':
      return { ...state, selectedUnitIds: change.unitIds };
    case 'selection/territory':
      return { ...state, selectedTerritoryId: change.territoryId };
    case 'selection/set':
      return { ...state, selectedUnitIds: change.unitIds, selectedTerritoryId: change.territoryId };
    case 'selection/clear':
      return { ...state, selectedUnitIds: [], selectedTerritoryId: null };
    case 'hover/set':
      return { ...state, hover: change.hover };
    case 'resolution/set':
      return { ...state, currentResolution: change.resolution };
    case 'auto-resolve/set':
      return { ...state, autoResolve: change.autoResolve };
    case 'animation/started':
      return { ...state, pendingAnimations: [...state.pendingAnimations, { id: change.id }] };
    case 'animation/completed':
      return {
        ...state,
        pendingAnimations: state.pendingAnimations.filter((a) => a.id !== change.id),
      };
  }
  // TS exhaustiveness ensures every variant above returns; this guards against
  // a future variant being added without a `case`.
  throw new Error(`Unhandled StateChange variant: ${JSON.stringify(change)}`);
}
