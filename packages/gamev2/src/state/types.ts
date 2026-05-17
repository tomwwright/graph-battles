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

/**
 * Turn flow state machine. Per-state data lives in the variant, not on the
 * orchestrator instance — prevents per-phase fields (advance callback, abort
 * controller, current player id) from leaking across transitions.
 */
export type Phase =
  | { type: 'next-player'; currentPlayerId: ID }
  | { type: 'planning'; currentPlayerId: ID }
  | { type: 'waiting'; submittedAtTurn: number }
  | {
      type: 'replaying';
      abort: AbortController;
      advance: ((v: 'next' | 'skip') => void) | null;
      /** Carried through from prior phase so UI keeps showing whose turn just resolved. */
      currentPlayerId: ID;
      /**
       * Fires when the replay finishes (or is aborted). The PhaseEffects
       * 'replaying' entry hook starts the replay and invokes this on
       * completion. `aborted` reflects whether the AbortController fired.
       *
       * Set by the post-resolution flow (`runReplayAndAdvance`) to advance
       * into next-player / victory; left undefined for set-turn scrubbing
       * past turns (the replay just stops, phase stays).
       */
      onComplete?: (aborted: boolean) => void;
    }
  | { type: 'victory' };

export type PhaseType = Phase['type'];

/**
 * Input event into the orchestrator. Single discriminated union replaces the
 * 7-method UserActionDispatch interface — easier to log, route, and reason
 * about which inputs are legal in which phase.
 */
export type Command =
  // Turn flow
  | { type: 'ready-player' }
  | { type: 'confirm-next-player' }
  | { type: 'set-turn'; turn: number }
  // Resolution
  | { type: 'resolve-next' }
  | { type: 'skip-resolution' }
  // Planning actions. `action: null` cancels the pending action on the territory.
  | { type: 'territory-action'; territoryId: ID; action: Values.TerritoryAction | null }
  | { type: 'cancel-move'; unitIds: ID[] }
  // Renderer-originated input
  | { type: 'click-territory'; territoryId: ID }
  | { type: 'click-unit'; unitId: ID };

export type Dispatch = (cmd: Command) => void;

/** Narrow `Command` to a specific variant. Convenient for handler signatures. */
export type Cmd<T extends Command['type']> = Extract<Command, { type: T }>;

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
  turn: number;

  /** Turn flow state machine. */
  phase: Phase;

  /** Optional user identity for remote play. When set, only this user's players appear in the planning cycle. */
  userId?: ID;

  // Selection
  selectedUnitIds: ID[];
  selectedTerritoryId: ID | null;
  hover: HoverInfo;

  // Resolution replay
  currentResolution: Resolution | null;
  autoResolve: boolean;

  // Visibility
  visibilityMode: VisibilityMode;
};
