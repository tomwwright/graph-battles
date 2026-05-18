# gamev2 Orchestration Refactor

Status: planned, not started.

Consolidates the four state-to-effect patterns in `@battles/gamev2` (commands/handlers, `PhaseChangeListeners`, syncers, `ResolutionRunner`) into a smaller, more consistent surface. Removes function-pointer fields from the `Phase` discriminated union, unifies animation through `pendingAnimations` in store state, and folds the resolution sequencer into the listener that owns its phase.

## Motivation

Today the package implements one idea — "state change → run effect" — four ways:

| Pattern | Trigger | Progress tracked via | Wired in |
|---|---|---|---|
| `PhaseChangeListeners` | `phase.type` transition | `lastPhase` field | constructor |
| Syncers (`UnitMeshSyncer`, `OverlaySyncer`) | `mapRevision` / selection diff | `lastRevision` field | `initialise` |
| `ResolutionRunner` | explicit `start()` from listener | `phase.advance` + `AbortController` | inside `ReplayingListener` |
| Commands → handlers | `dispatch(cmd)` | none, sync | switch in `handle` |

Pain points:

- `Phase.replaying` carries callable fields (`advance`, `onComplete`) and an `AbortController`. Same-type `setState` must spread `{...phase}` to preserve them — a documented gotcha in `packages/gamev2/AGENTS.md`. The gotcha exists because the abstraction leaks.
- Two animation pathways: `ResolutionRunner` calls renderer methods directly; syncers project state to renderer for everything else. Works only because `UnitRenderer.animatingUnits` skips lerping units mid-animation.
- `PhaseChangeListeners` takes `GameStore` directly; syncers take `Subscribable<T>`. Inconsistent dependency surface.
- Three-tier `currentPlayerId` fallback duplicated across `setTurn.ts:21-23`, `ReplayingListener.ts:62-65`, `GameOrchestrator.ts:196-198`.
- Latent bug: scrubbing `set-turn` while already in `replaying` is a same-type `setState`. `PhaseChangeListeners` does not fire entry/exit on same-type transitions, so the old generator's abort never fires and no new generator starts.

## Outcome

| Surface | Before | After |
|---|---|---|
| Store mutation | `setState(partial)` everywhere | `dispatch(change: StateChange)` reducer |
| Animation coordination | Direct `renderer.animate*` from runner | `pendingAnimations` in store; syncers register |
| Phase hooks | `PhaseChangeListeners` central | Self-subscribing listeners |
| Sequencer | `ResolutionRunner` class | Inlined into `ReplayingListener` |
| `Phase.replaying` | `{ abort, advance, onComplete, currentPlayerId }` | `{ currentPlayerId }` |
| Per-entity rendering | `UnitMeshSyncer`, `OverlaySyncer` snap-only; runner animates | `UnitSyncer`, `TerritorySyncer`, `CameraSyncer` own snap + animate |

After the refactor the pattern surface is:

| Shape | Files | Role |
|---|---|---|
| Handler | one per command in `handlers/` | input → state transition |
| Syncer | `UnitSyncer`, `TerritorySyncer`, `CameraSyncer` | state → renderer (snap + animate) |
| Listener | `WaitForTurnResolutionListener`, `ReplayingListener` | phase-bound async lifecycle, self-subscribing |
| Orchestrator | `GameOrchestrator` | wiring + routing + lifecycle, no algorithm |

## Phasing principle

Every phase ends with the dev server working and the user-visible flow unchanged. The refactor is structural, not behavioural, except for the replay → replay restart fix in phase 8. No phase touches both data shape and call sites in the same commit unless the diff is small.

No tests exist for gamev2. Verification is via `yarn workspace @battles/gamev2 dev` after each phase.

---

## Phase 1 — Reducer foundation

**Goal:** Introduce `dispatch` and a reducer alongside the existing `setState`. Don't migrate call sites yet.

**Files:**
- `src/state/types.ts` — add `StateChange` union (start with one variant: `{ type: 'patch'; partial: Partial<StoreState> }`).
- `src/state/reducer.ts` (new) — `reducer(state, change): StoreState`. `patch` action does the existing merge + auto-bump for `'map' in partial`.
- `src/state/GameStore.ts` — add `dispatch(change: StateChange): void` that runs the reducer + notifies. `setState(partial)` is rewritten as `dispatch({ type: 'patch', partial })`.

**Verification:** Dev server. All behaviour identical (every existing site still calls `setState`).

**Risk:** Tiny. Pure plumbing.

---

## Phase 2 — Name every mutation

**Goal:** Replace `setState(partial)` call sites with typed actions. Extend `StateChange` union as each call site is converted. Final `patch` variant deleted at end of phase.

**Action vocabulary (proposed):**

```ts
type StateChange =
  | { type: 'init'; state: StoreState }
  | { type: 'map/mutated' }                                                       // bumps revision
  | { type: 'map/replaced'; map: GameMap; turn?: number }
  | { type: 'turn/scrubbed-to-past'; turn: number; map: GameMap; currentPlayerId: ID }
  | { type: 'turn/jumped-to-current'; turn: number; map: GameMap; currentPlayerId: ID }
  | { type: 'phase/set'; phase: Phase }
  | { type: 'selection/units'; unitIds: ID[] }
  | { type: 'selection/territory'; territoryId: ID | null }
  | { type: 'selection/clear' }
  | { type: 'hover/set'; hover: HoverInfo }
  | { type: 'resolution/set'; resolution: Resolution | null }
  | { type: 'animation/started'; id: string }                                     // phase 4
  | { type: 'animation/completed'; id: string };                                  // phase 4
```

**Naming convention:** `<area>/<verb-past>` for state changes. Distinct from `Command` (`<verb-noun>` for input). `Actions.ModelAction` from `@battles/models` is the domain action shape — keep that name and term separate.

**Files touched (in order, one commit each):**

1. `src/orchestration/GameOrchestrator.ts` — `initialise` setState → `init` action. `handleWaitForTurnError` → `phase/set`. `applyAction` → `map/mutated` after `map.applyAction`.
2. `src/orchestration/handlers/*.ts` — each handler. `setTurn` is the heaviest (two compound actions: `turn/scrubbed-to-past` and `turn/jumped-to-current`).
3. `src/orchestration/ReplayingListener.ts` — `runReplayAndAdvance`, `afterPostResolutionReplay`, `waitForAdvance` (the last still mutates `phase.advance` — keep as-is here, addressed in phase 8).
4. `src/orchestration/ResolutionRunner.ts` — `setState({ currentResolution })` → `resolution/set`. `updateMapState` → `map/mutated`.
5. Delete `patch` variant from `StateChange` and `setState` from `GameStore`. Final commit of the phase.

**Verification:** Dev server after each commit. Click through a full turn (planning → ready all players → resolve step-by-step → next player).

**Risk:** Mechanical typo risk across many sites. TS exhaustiveness on the reducer switch catches missing variants. Reducer should `assertNever(change)` in `default` to enforce.

---

## Phase 3 — Selector for `currentPlayerId` fallback

**Goal:** One selector replaces the three-tier `currentPlayerIdFromPhase(phase) ?? selectPlayablePlayerIds(state)[0] ?? state.map.playerIds[0]` chain.

**Files:**
- `src/state/selectors.ts` — add `selectResolvedCurrentPlayerId(state: StoreState): ID`.
- `src/orchestration/handlers/setTurn.ts:21-23`, `src/orchestration/ReplayingListener.ts:62-65`, `src/orchestration/GameOrchestrator.ts:196-198` — inline the selector.

**Verification:** Dev server. Set-turn scrub. WaitForTurn error path is hard to repro — at least verify TS compiles and the code path looks right.

**Risk:** None. Pure dedupe.

---

## Phase 4 — `pendingAnimations` in store

**Goal:** Add the field, the actions, and a helper. No consumers register animations yet.

**Files:**
- `src/state/types.ts` — `pendingAnimations: AnimationToken[]` on `StoreState`; `AnimationToken = { id: string }` type.
- `src/state/reducer.ts` — `animation/started` and `animation/completed` cases.
- `src/state/GameStore.ts` — `trackAnimation(promise: Promise<unknown>): void` helper. Generates id, dispatches `animation/started`, dispatches `animation/completed` in `finally`.
- `src/state/selectors.ts` — `selectAnimationsIdle(state): boolean` (just `pendingAnimations.length === 0`).
- `src/orchestration/GameOrchestrator.ts` — initial state in `init` action includes `pendingAnimations: []`.

**Verification:** Dev server. State logs show `pendingAnimations: []` consistently.

**Risk:** None. Dormant feature.

---

## Phase 5 — Per-entity syncers own animations

**Goal:** Move animation logic out of `ResolutionRunner` into syncers. `ResolutionRunner` becomes pure orchestration.

**Files:**

- Rename `src/orchestration/UnitMeshSyncer.ts` → `UnitSyncer.ts`. Extend:
  - Track `lastPositions: Map<ID, ID>` and `lastStatuses: Map<ID, Status[]>`.
  - On sync, when `currentResolution?.phase === 'move'` and the unit matches, call `store.trackAnimation(renderer.animateUnitMove(unitId, prev, next, signal))` instead of snapping.
  - Otherwise snap as today.
  - `signal` source: pass an `AbortSignal` from the listener (phase 7).
- Rename `src/orchestration/OverlaySyncer.ts` → `TerritorySyncer.ts`. Extend:
  - Track `lastProperties: Map<ID, TerritoryProperty[]>`.
  - When `currentResolution?.phase === 'territory-action'` and territory matches, call `renderer.updateTerritoryComposition(id, lastProps, currentProps)` and `store.trackAnimation(...)` if it returns a promise.
  - Ownership colour repaint (current logic) absorbs the `territory-control` resolution naturally — already happens on every revision.
- New `src/orchestration/CameraSyncer.ts`:
  - Subscribes to `currentResolution`. When non-null and focusable, calls `renderer.focusOn(territoryId)` and tracks via `store.trackAnimation`.
  - Owns `getResolutionFocusTerritory` logic (moved from `ResolutionRunner`).
- `src/orchestration/GameOrchestrator.ts` — construct `CameraSyncer` next to the others.
- `src/orchestration/ResolutionRunner.ts`:
  - Delete `animateResolution`, `getResolutionFocusTerritory`, `playerColor`, `PreState`, `capturePreState`.
  - `run` becomes: visibility filter → `dispatch({ type: 'resolution/set', resolution })` → `await waitForAnimations()` (pre-step focus) → `await waitForAdvance()` → `generator.next()` → `dispatch({ type: 'map/mutated' })` → `await waitForAnimations()`.
  - `waitForAnimations()` subscribes for `pendingAnimations.length === 0`.

**Verification:** Dev server. Full turn resolution: each step focuses camera, animates unit move, animates territory composition delta. Skip-to-end drains. Scrub-to-past replays.

**Risk:** High. Animation timing changes. Three pitfalls:

1. **Order of state mutations.** `resolution/set` must happen *before* `map/mutated`, otherwise the syncer sees the new map without the resolution context. The sequencer already does this — preserve.
2. **`lastPositions` priming.** When `UnitSyncer` mounts on init, prime `lastPositions` from initial map. Otherwise the first animation reads `undefined` as start position.
3. **Synchronous subscriber fire-order.** `setState({ resolution/set })` notifies; syncer must register the animation promise *before* `await waitForAnimations()` runs. `GameStore.notify` is synchronous, so this holds — but be careful if any async slips into the syncer's `onChange`.

**Rollback:** Each rename + new file is reversible. Keep `ResolutionRunner.run` working at every commit.

---

## Phase 6 — Self-subscribing listeners; drop `PhaseChangeListeners`

**Goal:** Each listener subscribes to `Subscribable<StoreState>` directly, tracks `lastPhase`, fires its own enter/exit. `PhaseChangeListeners.ts` deleted.

**Files:**

- `src/orchestration/WaitForTurnResolutionListener.ts`:
  - Constructor takes `(source: Subscribable<StoreState>, provider, callbacks)`.
  - Subscribe, track `lastPhase: Phase | null`.
  - On change detect transitions involving `'waiting'`, call internal `onEnter`/`onExit`.
  - `dispose()` unsubscribes + cancels.
- `src/orchestration/ReplayingListener.ts`:
  - Same constructor shape (source + deps).
  - Subscribe, track `lastPhase`. Detect transitions involving `'replaying'`.
- `src/orchestration/GameOrchestrator.ts`:
  - Delete `phaseEffects` field and the `.onEnter/.onExit` chain.
  - Listeners constructed with `this.store` as `source` (`GameStore` structurally fits `Subscribable<StoreState>`).
  - `dispose()` calls each listener's `dispose()`.
- Delete `src/orchestration/PhaseChangeListeners.ts`.

**Verification:** Dev server. Verify all four transitions:

- Last ready-player → `waiting` (poll starts).
- `waiting` resolved → `replaying` (replay starts).
- `replaying` complete → `next-player` or `victory`.
- `set-turn` scrub from `planning` → `replaying`.
- `set-turn` from `replaying` → `planning` (poll/replay aborted).

**Risk:** Medium. Two specific concerns:

1. **Initial phase entry.** `PhaseChangeListeners` is currently constructed before the first real `setState`, so the placeholder → real transition fires the entry hook (`packages/gamev2/AGENTS.md:115-116`). New self-subscribing listeners must do the same — constructed before `initialise` calls `dispatch({ type: 'init', ... })`.
2. **Cross-listener ordering.** Two listeners independently observe the same `setState`. For the `waiting → replaying` transition: `WaitForTurnResolutionListener.onChange` fires `cancel()`, `ReplayingListener.onChange` fires `start()`. Both are independent — no shared resource — so order is irrelevant. Document this in `ReplayingListener.ts` to forestall future doubt.

---

## Phase 7 — Fold sequencer into `ReplayingListener` (Option B)

**Goal:** Delete `ResolutionRunner.ts`. Inline the loop into `ReplayingListener`.

**Files:**

- `src/orchestration/ReplayingListener.ts`:
  - Add `private pending: ((v: 'next' | 'skip') => void) | null = null`.
  - Add `private currentAbort: AbortController | null = null`.
  - Add `private pendingOnComplete: ((aborted: boolean) => void) | null = null`.
  - Move `run(generator, signal)` loop into the listener (private method).
  - Add public `advance(action: 'next' | 'skip')` that resolves `this.pending` and clears it.
  - `onEnter('replaying')` creates a new abort, captures `pendingOnComplete`, invokes `this.run(...)`.
  - `onExit('replaying')` calls `this.currentAbort?.abort()`.
- `src/orchestration/HandlerContext.ts`:
  - Add `advanceResolution(action: 'next' | 'skip'): void`.
- `src/orchestration/GameOrchestrator.ts`:
  - `ctx.advanceResolution = (a) => this.replayingListener.advance(a)`.
  - Delete `private resolutionRunner` field and import.
- `src/orchestration/handlers/advanceResolution.ts`:
  - Replace `phase.advance?.(...)` and the `phase: {...phase, advance: null}` reset with `ctx.advanceResolution(...)`.
- Delete `src/orchestration/ResolutionRunner.ts`.

**Verification:** Dev server. Step-by-step resolution, skip, abort via set-turn during replay.

**Risk:** Medium. The `runReplayAndAdvance` path now sets `pendingOnComplete` on the listener instance, then dispatches the phase transition, then `onChange` fires `onEnter` which reads `pendingOnComplete`. Synchronous flow — works because `GameStore.notify` is synchronous. Document this dependency on synchronous notify in `ReplayingListener`.

---

## Phase 8 — Strip `Phase.replaying` callable fields and abort

**Goal:** `Phase.replaying` becomes `{ type: 'replaying'; currentPlayerId: ID }`. All lifecycle state lives on the listener.

**Files:**

- `src/state/types.ts` — `Phase.replaying` loses `abort`, `advance`, `onComplete`.
- `src/orchestration/handlers/setTurn.ts:25-36`:
  - Remove `const abort = new AbortController()`.
  - Dispatch `{ type: 'turn/scrubbed-to-past', turn, map, currentPlayerId: carriedPlayerId }`. Reducer sets phase = `replaying` + map/turn/selection.
  - Listener's `onChange` sees the transition (or replay → replay reentry) and starts.
- `src/orchestration/ReplayingListener.ts`:
  - `currentAbort` owned by listener.
  - `runReplayAndAdvance`: dispatch a transition action that sets map + phase. No `abort` or `onComplete` in the action.
  - `onChange` detects `replaying → replaying` (same type) explicitly: if `lastPhase?.type === 'replaying' && next.type === 'replaying'`, abort current and start new. Add a comment explaining the case.
- `src/orchestration/handlers/advanceResolution.ts` — already calling `ctx.advanceResolution`. Phase guard remains.

**Latent bug fix:** Phase 8 incidentally fixes the replay → replay restart leak (current code's same-type `setState` never aborted the prior abort or restarted the generator). Listener-owned abort and explicit reentry detection handle it correctly.

Test path: enter step-by-step replay, scrub to an earlier past turn mid-replay. Old generator should stop, new generator should start.

**Verification:** Dev server. Run the latent-bug scenario specifically.

**Risk:** Medium-high. Phase variant shape change cascades through TS. Compiler enforces correctness; behavioural risk concentrated in the reentry path. Verify with the dev server scenario explicitly.

---

## Phase 9 — Cleanup + docs

**Goal:** Drop dead code, update AGENTS.md.

**Files:**

- `packages/gamev2/AGENTS.md` — rewrite the sections that describe `PhaseChangeListeners`, `ResolutionRunner`, the function-pointer phase fields, and the spread gotcha. Add a section on `StateChange` actions and the syncer-driven animation flow.
- Remove unused imports, unused `Subscribable` exports if any.
- Verify no stale `// removed because…` comments left behind.

**Verification:** `yarn workspace @battles/gamev2 build` clean. Dev server flow once more end-to-end.

**Risk:** None.

---

## Order rationale

- 1 → 2 introduces the reducer with zero behavioural change before any harder refactor. Reducer is in place when handlers are restructured later.
- 3 is a free win sitting near the surface; doing it before 6/8 means handler files are touched once.
- 4 must come before 5 (animations field needed before syncers register).
- 5 must come before 6 because `ResolutionRunner` still depends on direct renderer calls until syncers own them; restructuring listeners (6) and folding the sequencer (7) is easier once 5 is done.
- 6 before 7: separate listener concerns first, then merge sequencer into the right one.
- 8 last among structural changes: relies on listener owning state (7) and on the reducer being in place (2).
- 9 documentation last.

## Cross-cutting risk: animation timing

Phases 5–8 each shift where animations are triggered. After phase 5, animations fire from syncer subscribers reacting to `resolution/set` and `map/mutated`. The sequencer must dispatch `resolution/set` before `map/mutated` so syncers diff against the correct context. Add a comment at the top of the sequencer loop body.

## Cross-cutting risk: StrictMode double-mount

`packages/gamev2/AGENTS.md` notes orchestrator + babylon use refs to survive StrictMode double-mount and skip dispose. Each new construct (listeners with own subscriptions, syncers with own subscriptions) follows the same pattern today. No new exposure unless a new top-level `useEffect` is introduced. None planned.

## Out of scope

- Resolver logic refactor (`refactor-resolver-logic-and-state.md`) — separate initiative in `@battles/models`.
- Animating `combat` / `food` / `gold` / `add-defend` resolution types. Currently silent; remain silent. Can be added later by extending `TerritorySyncer` / `UnitSyncer` once the new pathway is in place.
- Reducer-style pure state for `GameMap`. Map remains mutated in place; `map/mutated` action signals the bump. A full pure-data map refactor is large and unrelated.
