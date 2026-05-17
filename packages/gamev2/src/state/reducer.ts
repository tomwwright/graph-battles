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
    case 'turn/scrubbed-to-past':
      return {
        ...state,
        map: change.map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: change.turn,
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
        phase: { type: 'replaying', abort: new AbortController(), advance: null, currentPlayerId: change.currentPlayerId },
      };
    case 'turn/jumped-to-current':
      return {
        ...state,
        map: change.map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: change.turn,
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
        phase: { type: 'planning', currentPlayerId: change.currentPlayerId },
      };
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
    case 'replay/started-post-resolution':
      return {
        ...state,
        map: change.map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        phase: {
          type: 'replaying',
          abort: new AbortController(),
          advance: null,
          currentPlayerId: change.currentPlayerId,
          onComplete: change.onComplete,
        },
      };
    case 'game/advanced-to-victory':
      return {
        ...state,
        game: change.game,
        map: change.map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: change.turn,
        phase: { type: 'victory' },
      };
    case 'game/advanced-to-next-player':
      return {
        ...state,
        game: change.game,
        map: change.map,
        mapRevision: (state.mapRevision ?? 0) + 1,
        turn: change.turn,
        phase: { type: 'next-player', currentPlayerId: change.currentPlayerId },
        selectedUnitIds: [],
        selectedTerritoryId: null,
        currentResolution: null,
      };
  }
  // TS exhaustiveness ensures every variant above returns; this guards against
  // a future variant being added without a `case`.
  throw new Error(`Unhandled StateChange variant: ${JSON.stringify(change)}`);
}
