import { Game, GameMap, ID, Resolution, Values } from '@battles/models';
import type { HexCoord } from '../rendering/HexCoordinates';

/**
 * Generic subscribable source of T. Anything that can hand out a current
 * snapshot and notify on change satisfies this — including `GameStore`,
 * which structurally fits `Subscribable<StoreState>` and (via covariance
 * of `getState`) any `Subscribable<U>` where `StoreState` is assignable
 * to `U`.
 */
export type Subscribable<T> = {
  getState(): T;
  subscribe(listener: () => void): () => void;
};

/** Narrow slice of store state that map-driven syncers care about. */
export type MapState = {
  map: GameMap;
  mapRevision: number;
};

export type VisibilityMode = 'all' | 'current-player';

export type HoverInfo =
  | { type: 'territory'; territoryId: ID; hexCoord: HexCoord }
  | { type: 'edge'; territoryA: ID; territoryB: ID; hexCoord: HexCoord }
  | null;

export type StoreState = {
  // Game state
  game: Game;
  map: GameMap;
  /**
   * Revision counter that bumps whenever `map` is set in `setState`.
   * `GameMap` is mutated in place, so its reference doesn't change — components
   * that derive from map data subscribe to this counter via `useGameStore` to
   * force a re-render after each mutation.
   */
  mapRevision: number;
  currentPlayerId: ID;
  turn: number;

  // UI phase
  turnPhase: 'planning' | 'ready' | 'replaying' | 'victory';

  // Selection
  selectedUnitIds: ID[];
  selectedTerritoryId: ID | null;
  hover: HoverInfo;

  // Resolution replay
  currentResolution: Resolution | null;

  // Visibility
  visibilityMode: VisibilityMode;
};

export type UserActionDispatch = {
  onReadyPlayer(): void;
  onResolveNext(): void;
  onSetTurn(turn: number): void;
  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void;
  onCancelTerritoryAction(territoryId: ID): void;
  onCancelMove(unitIds: ID[]): void;
};
