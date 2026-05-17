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

/**
 * Capability interface: emit a typed state change against the store reducer.
 * Consumers depend on this instead of the concrete `GameStore` so the write
 * surface is the only thing they see.
 */
export type StateDispatcher = {
  dispatch(action: StateChange): void;
};

/**
 * Capability interface: register an in-flight animation with the store so
 * `pendingAnimations` reflects the lifecycle. Syncers consume this; the
 * resolution runner awaits `pendingAnimations.length === 0` between steps.
 */
export type AnimationTracker = {
  trackAnimation(promise: Promise<unknown>): string;
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

/**
 * Discriminated union of every named mutation accepted by the store reducer.
 *
 * Naming convention: `<area>/<verb-past>`. Distinct from `Command` (input)
 * and from `Actions.ModelAction` from `@battles/models` (domain action).
 */
export type StateChange =
  /** Replace the entire store state. Used once during `GameOrchestrator.initialise`. */
  | { type: 'init'; state: StoreState }
  /**
   * Signal that `state.map` was mutated in place — bump `mapRevision` so
   * `useSyncExternalStore` selectors re-run. The map reference is unchanged.
   */
  | { type: 'map/mutated' }
  /**
   * Scrub to a past turn — replace the map (cloned upstream so replay mutations
   * don't poison persisted snapshots), set turn, clear selection and
   * resolution, transition to 'replaying'.
   */
  | { type: 'turn/scrubbed-to-past'; turn: number; map: GameMap; currentPlayerId: ID }
  /**
   * Jump back to the current turn — replace the map with the live snapshot,
   * set turn, clear selection and resolution, transition to 'planning'.
   */
  | { type: 'turn/jumped-to-current'; turn: number; map: GameMap; currentPlayerId: ID }
  /** Set the turn-flow phase. */
  | { type: 'phase/set'; phase: Phase }
  /** Replace the selected unit list. */
  | { type: 'selection/units'; unitIds: ID[] }
  /** Set the selected territory (null clears it). */
  | { type: 'selection/territory'; territoryId: ID | null }
  /** Replace both unit and territory selection in one shot. */
  | { type: 'selection/set'; unitIds: ID[]; territoryId: ID | null }
  /** Clear both unit and territory selection. */
  | { type: 'selection/clear' }
  /** Set hover info from renderer. */
  | { type: 'hover/set'; hover: HoverInfo }
  /** Set the in-flight resolution shown by the UI (null when no resolution is mid-flight). */
  | { type: 'resolution/set'; resolution: Resolution | null }
  /** Toggle the auto-advance flag used by `ActionBar` to drive step-through replay. */
  | { type: 'auto-resolve/set'; autoResolve: boolean }
  /** A syncer kicked off an animation. Adds the token to `pendingAnimations`. */
  | { type: 'animation/started'; id: string }
  /** An animation finished (or aborted). Removes the token from `pendingAnimations`. */
  | { type: 'animation/completed'; id: string }
  /**
   * Post-resolution replay begins. Replaces map with the pre-resolve snapshot,
   * sets phase to 'replaying' with a fresh AbortController and `onComplete`
   * carrying the post-replay advance closure. Phase 8 of the refactor moves
   * abort/onComplete off the phase variant — this action will simplify then.
   */
  | {
      type: 'replay/started-post-resolution';
      map: GameMap;
      currentPlayerId: ID;
      onComplete: (aborted: boolean) => void;
    }
  /** Game advanced after replay completed with a winner. */
  | { type: 'game/advanced-to-victory'; game: Game; map: GameMap; turn: number }
  /** Game advanced after replay completed with no winner. Clears selection + resolution. */
  | {
      type: 'game/advanced-to-next-player';
      game: Game;
      map: GameMap;
      turn: number;
      currentPlayerId: ID;
    };

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

  /**
   * In-flight animations registered by syncers. Empty when the renderer is
   * idle. The resolution sequencer awaits `pendingAnimations.length === 0`
   * between steps so animations complete before the next mutation is applied.
   *
   * Tokens are opaque identifiers — only the count matters.
   */
  pendingAnimations: AnimationToken[];
};

export type AnimationToken = { id: string };
