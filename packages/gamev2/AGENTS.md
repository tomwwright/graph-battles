# AGENTS.md — `@battles/gamev2`

Modern game client. Babylon.js 9 scene + React 19 UI, glued by a `GameOrchestrator`. Served at `/v2/` (Vite `base`). See repo-root `AGENTS.md` for monorepo context and `packages/models` for the domain model.

## Stack

- Vite 6, React 19, TypeScript 6
- `@babylonjs/core` + `loaders`, `gui`, `inspector`, `materials`, `addons`
- `@fluentui/react-components` 9 for UI panels
- Depends on `@battles/models` (domain) and `@battles/api` (REST client + view-data envelope helpers)
- No test suite — verify via `yarn workspace @battles/gamev2 dev`

Scripts: `dev`, `build` (`tsc && vite build`), `preview`, `package` (zips `dist/` for ops upload).

## Layers

Three concentric layers. Outer layer never touches inner internals — go through the bridge.

```
React UI (src/ui)
   ▲ subscribes via useGameStore / dispatches Commands via useDispatch
   │
GameOrchestrator (src/orchestration) ─── owns ───▶ GameStore (src/state)
       │                                                ▲
       │ routes Commands                                │ listeners + syncers
       │ to handlers                                    │ self-subscribe via
       ▼                                                │ narrow ...State slices
handlers/*.ts ── dispatch(StateChange) ────────────────┘
                                                        │
                                                        ▼
                                          UnitSyncer / TerritorySyncer /
                                          CameraSyncer ── push ──▶ GameRenderer
                                                                       │
                                                                       ▼
                                                              Babylon Scene
```

- **`src/state/GameStore.ts`** — pub/sub container for `StoreState`. State changes flow through `dispatch(action: StateChange)` which runs the `reducer`. `GameMap` is mutated in place, so the reducer bumps `mapRevision` whenever an action replaces the map or signals an in-place mutation. React subscribes via `useGameStore(selector)` (wraps `useSyncExternalStore`). Also exposes `trackAnimation(promise)` — adds an `AnimationToken` to `pendingAnimations` for the lifetime of the promise.
- **`src/state/types.ts`** — owns `Phase` (turn-flow state machine, see below), `Command` (input union), `StateChange` (named mutations consumed by the reducer), and capability interfaces (`Subscribable<T>`, `StateDispatcher`, `AnimationTracker`).
- **`src/state/reducer.ts`** — pure switch from `StateChange` → next `StoreState`. Every state-shape change has a named variant; the reducer is the only place state shape is mutated.
- **`src/state/selectors.ts`** — selectors typed against narrow `<S extends ...State>` slices so consumers pass their own minimal state types. Key selectors: `selectCurrentPlayerId`, `selectResolvedCurrentPlayerId` (three-tier fallback used by handlers), `selectNoRunningAnimations`.
- **`src/orchestration/GameOrchestrator.ts`** — wiring + routing + lifecycle. Builds `HandlerContext`, constructs self-subscribing listeners + syncers, routes `Command`s to handlers via a switch. Owns the concrete `GameStore`; all consumers reference interfaces.
- **`src/orchestration/HandlerContext.ts`** — service interface passed to handlers: `getState`, `dispatch`, `applyAction`, `advanceResolution`. Keeps handlers free of direct dependencies on `GameStore`, provider, renderer, listener.
- **`src/orchestration/WaitForTurnResolutionListener.ts`** — self-subscribing listener for the `waiting` phase. Tracks `lastPhase`; on enter starts `provider.waitForTurn`, on exit aborts. Resolved turn flows back via injected `onResolved` callback. Reads via `Subscribable<WaitForTurnResolutionListenerState>` (`{ phase; turn }`).
- **`src/orchestration/ReplayingListener.ts`** — self-subscribing listener for the `replaying` phase. Drives the `resolveTurn` generator inline (no separate runner class), owns the `AbortController`, the step-gate resolver (`pending`), and the post-replay continuation (`pendingOnComplete`). Detects replay → replay session changes by `state.map` reference inequality. Also exposes `runReplayAndAdvance(resolved, priorTurn)` for the wait-listener callback and `advance(action)` for the `advanceResolution` handler.
- **`src/orchestration/handlers/`** — one file per command. Each handler is a function `(ctx: HandlerContext, cmd: Cmd<'…'>) => void`. Phase guards live at top of each handler.
- **`src/orchestration/selection.ts`** — pure selection logic for unit/territory clicks. Returns a `Selection | null` (no longer `Partial<StoreState>`). Consumed by `clickUnit` / `clickTerritory` handlers.
- **`src/rendering/GameRenderer.ts`** — facade over `SceneRenderer` / `CameraController` / `HexGridController` / `MapRenderer` / `UnitRenderer` / `AssetLoader`. Only rendering API the orchestration layer uses. Scene state lives here; game state does NOT.
- **Syncers** in `src/orchestration` self-subscribe to the store via narrow `Subscribable<...State>` slices and project state to the renderer:
  - `UnitSyncer` — diff units on `mapRevision` change. Add/remove/reposition meshes, set status + planned-move lines. When `currentResolution.phase === 'move'` and the unit matches, animates via `animateUnitMove` and registers the promise through `tracker.trackAnimation`; otherwise snaps.
  - `TerritorySyncer` — repaint hex tile overlays on `mapRevision` or selection change. Base layer = ownership colours (covers `territory-control` resolutions implicitly); selection layer = valid destinations + grass waypoints, or selected territory highlight. Also owns composition delta: when `currentResolution.phase === 'territory-action'` and the territory matches, hands `lastProperties` + `nextProperties` to the renderer for tile-mesh diffing.
  - `CameraSyncer` — subscribes to `currentResolution`. When non-null, resolves the focus territory and calls `renderer.focusOn`, tracking the in-flight promise so the replay loop's idle gate waits for it.

## GameOrchestrator — flow

`new GameOrchestrator(store, renderer, provider, userId?)` then `await initialise(renderMap)`.

Constructor wires the listeners up front so they observe the very first phase transition. `initialise` order:
1. `provider.get()` → build `GameMap` from `game.latestMap`.
2. Resolve `playablePlayerIds` via `resolvePlayablePlayerIds(game, userId, map)` — if `userId` set, only that user's players (mirrors v1 `setFilteredUserIds`); else all players (hot-seat / stub). NOT stored — derived on demand via `selectPlayablePlayerIds(state)`.
3. Compute `notReadyPlayablePlayerIds`. Initial `phase` = `{ type: 'next-player', currentPlayerId: <first not-ready playable> }` unless all playable already ready, then `{ type: 'waiting', submittedAtTurn: game.turn }`.
4. Dispatch `init` action. `WaitForTurnResolutionListener` (constructed in the orchestrator ctor) observes the `next-player`/`waiting` transition from the placeholder phase; if the initial real phase is `waiting`, the listener kicks `provider.waitForTurn` on its own — no explicit call from `initialise`.
5. `renderer.initialise(renderMap, map)` then register input callbacks. Renderer clicks become `click-territory` / `click-unit` commands.
6. Construct `UnitSyncer` + `TerritorySyncer` + `CameraSyncer`.

### Phase state machine

`Phase` is a discriminated union (`type` discriminator). Per-phase data lives inside the variant — no leaking instance fields on the orchestrator.

| Phase | Data | UI shown | Legal commands |
|---|---|---|---|
| `next-player` | `currentPlayerId` | `NextPlayerPopup` | `confirm-next-player`, `set-turn`, click (inspect) |
| `planning` | `currentPlayerId` | input enabled | `territory-action`, `cancel-move`, `ready-player`, `set-turn`, clicks |
| `waiting` | `submittedAtTurn` | none | `set-turn` only |
| `replaying` | `currentPlayerId` (carried) | `ResolutionPanel`, `ActionBar` step controls | `resolve-next`, `skip-resolution`, `set-turn` (aborts) |
| `victory` | — | `VictoryPopup` | `set-turn` |

`replaying` is plain data — no callable fields. The in-flight `AbortController`, step-gate resolver, and post-replay continuation all live on `ReplayingListener` itself.

### Commands → handlers

All input flows through `dispatch(cmd: Command)`:

```
dispatch → GameOrchestrator.handle(cmd) → switch → handlers/<command>.ts → ctx.dispatch / ctx.applyAction / ctx.advanceResolution
```

Each `Command` variant has its own file in `src/orchestration/handlers/`. Handlers receive a `HandlerContext` and the typed command. Phase guards live at the top of each handler — illegal `(phase, command)` pairs early-return rather than throwing (input races during phase transitions are normal — clicks landing while a phase change is in flight shouldn't throw).

| Command | File | Notes |
|---|---|---|
| `click-unit` | `clickUnit.ts` | Calls `selectionFromUnitClick`. Inspect-only outside `planning`. |
| `click-territory` | `clickTerritory.ts` | Calls `selectionFromTerritoryClick`. Click on valid destination → `applyAction({type:'move-units',...})`. |
| `territory-action` | `territoryAction.ts` | Planning-only. `action: null` cancels pending. |
| `cancel-move` | `cancelMove.ts` | Planning-only. `destinationId: null` refunds the move. |
| `confirm-next-player` | `confirmNextPlayer.ts` | `next-player` → `planning`. |
| `ready-player` | `readyPlayer.ts` | Planning-only. Cycles `selectPlayablePlayerIds(state)`. Last → `waiting` (listener picks up the transition and kicks the poll). |
| `set-turn` | `setTurn.ts` | Validates range. Past turn → `turn/scrubbed-to-past` (phase becomes `replaying`; listener aborts any current replay and starts a new one). Current turn → `turn/jumped-to-current` (phase becomes `planning`). |
| `resolve-next` / `skip-resolution` | `advanceResolution.ts` | Replaying-only. Calls `ctx.advanceResolution(...)` which resolves the listener's step gate. |

`HandlerContext` surface (implemented in `GameOrchestrator`):
- `getState()` — read current `StoreState`.
- `dispatch(action)` — emit a typed `StateChange` to the reducer.
- `applyAction(action)` — `map.applyAction(action)`, dispatch `map/mutated`, fire-and-forget `provider.action(currentPlayerId, action)`. Errors logged, not surfaced.
- `advanceResolution(action)` — resolve the in-flight replay step gate. Delegates to `ReplayingListener.advance`.

### Phase-bound side effects

Each phase that has async lifecycle owns a self-subscribing listener. The listener subscribes to its own narrow slice of `StoreState`, tracks the previous phase, and fires entry/exit work directly — no central registry.

| Phase | Listener | On enter | On exit |
|---|---|---|---|
| `waiting` | `WaitForTurnResolutionListener` | allocate `pollAbort`, call `provider.waitForTurn(turn, signal)`, route resolution to `onResolved(resolved, turn)` callback | `pollAbort?.abort()` — aborted poll rejects with `AbortError`, swallowed |
| `replaying` | `ReplayingListener` | new `AbortController`, `resolveTurn(map)` generator, drive loop inline; on completion fire `pendingOnComplete?(aborted)` | `currentAbort?.abort()` |

`WaitForTurnResolutionListener.onResolved` is wired by the orchestrator to call `ReplayingListener.runReplayAndAdvance(resolved, priorTurn)`. `onError` is handled in the orchestrator (`handleWaitForTurnError`) — drops back to `planning` so the user can retry.

`ReplayingListener` captures its post-replay callback on the listener instance (`pendingOnComplete`) before dispatching `replay/started-post-resolution`. On the entry triggered by that dispatch, the listener consumes the captured callback. Synchronous `notify` ordering makes this safe.

`replaying → replaying` reentry (e.g. `set-turn` scrubbing to a different past turn while mid-replay) is detected by `state.map` reference inequality, not phase type. The reducer constructs a fresh `GameMap` for each turn scrub, so the new map ref signals a new session; in-place mutations during generator iteration keep the same ref. Listener aborts the current replay and starts a new one.

Listeners are constructed BEFORE `initialise`'s `init` dispatch, so the placeholder→real phase transition fires the appropriate entry path automatically.

### Provider AbortSignal

`GameProvider.waitForTurn(currentTurn, signal?)` accepts an optional `AbortSignal`. `APIGameProvider` honours it (cancels both the `get()` await window and the inter-poll sleep), rejecting with `AbortError`. `LocalGameProvider` and `StubGameProvider` ignore the signal — they're synchronous one-shots. Callers should treat `AbortError` as a normal cancellation, not a failure.

### Selection rules

`selectionFromUnitClick` (in `src/orchestration/selection.ts`):
- No selection / different-owner / non-unit selection → replace with `[unitId]`.
- Same owner, not in selection → add (multi-select).
- Same owner, in selection → remove (toggle off).
- Selecting unit clears `selectedTerritoryId` (mutually exclusive). Host territory derived for overlays, NOT stored.
- Non-`planning` phase: single-select for inspection only.

`selectionFromTerritoryClick`:
- Non-`planning` phase: select for inspection.
- Units selected + click on valid destination → emit `move-units` action effect.
- Otherwise: select territory, clear units.

### Set-turn (scrubber)

`set-turn` dispatches either `turn/scrubbed-to-past` or `turn/jumped-to-current`. For a past turn it clones `game.data.maps[turn-1]` (so replay mutations don't poison persisted state). `ReplayingListener` aborts any in-flight replay on the phase transition; if both the prior and new phase are `replaying`, the listener detects the new session via `state.map` reference change and restarts. `currentPlayerId` carried via `selectResolvedCurrentPlayerId(state)`.

### Ready-player cycle

`ready-player` increments through `playablePlayerIds`. Last player ready → dispatch `phase/set { type: 'waiting' }`. `WaitForTurnResolutionListener` observes the transition and starts the poll.

### Replay-and-advance

`ReplayingListener.runReplayAndAdvance(resolved, priorTurn)`:
1. Capture `onComplete = afterPostResolutionReplay` on the listener instance.
2. Dispatch `replay/started-post-resolution` with `priorTurn` snapshot as the new map (pre-resolve, all pending actions baked in).
3. The listener's own `onChange` enters replay, runs the generator inline, fires `onComplete(aborted)` on completion.
4. `afterPostResolutionReplay`: if aborted, bail. Else check `winningPlayers` → dispatch `game/advanced-to-victory` (winners) or `game/advanced-to-next-player` (no winners).

## Resolution loop (`ReplayingListener.driveGenerator`)

Drives the `resolveTurn(map)` generator from `@battles/models`. Generator yields each `Resolution` BEFORE applying its mutation. The next `generator.next()` applies the mutation. The window between gives the loop a chance to publish state and wait.

Per resolution:
1. Visibility filter — skip if `visibilityMode === 'current-player'` and resolution invisible to `currentPlayerId` (`isUnitVisible` / `isLocationVisible` from `Utils.ts`).
2. Dispatch `resolution/set` so React UI shows what's about to happen. `CameraSyncer` picks this up and asks the renderer to focus, registering the in-flight focus promise via `trackAnimation`.
3. `await waitForNoRunningAnimations(signal)` — settles after camera focus completes.
4. `await waitForAdvance()` — resolved by `ReplayingListener.advance(action)` (invoked via `HandlerContext.advanceResolution`).
5. On `'skip'`: drain remaining via `generator.next()`, dispatch `resolution/set: null` then `map/mutated` so syncers snap the final state.
6. Otherwise advance generator (apply mutation), dispatch `map/mutated`. Syncers diff — `UnitSyncer` animates moves matching the current resolution (and tracks the animation), `TerritorySyncer` runs composition deltas, `TerritorySyncer` ownership pass covers `territory-control`.
7. `await waitForNoRunningAnimations(signal)` — waits for animation tokens to clear, then loops.

Order: `resolution/set` must dispatch BEFORE `map/mutated` so syncers reading the new map see the resolution context.

Animation coverage today: `move` (lerp), `territory-action` (composition delta), `territory-control` (ownership repaint via base layer). `combat` / `food` / `gold` / `add-defend` are not animated.

Camera focus mapping lives in `CameraSyncer.getResolutionFocusTerritory`: `move`/`add-defend` → unit's territory (resolve edge → `territoryAId`); `combat` → location (territory or edge); `food`/`territory-control`/`territory-action` → `territoryId`; `gold` → no focus.

## React UI

`src/main.tsx` provider chain (outer → inner): `GameSessionProvider` → `CursorProvider` → `BabylonJsProvider` → `GameOrchestratorProvider` → `App`.

- **`GameSessionProvider`** — reads URL params (`gameId`, `userId`, `local`). Constructs the right `GameProvider`, fetches map text, parses `RenderMap`, validates against `game.data.maps[0]`. No `gameId` → stub provider with `STUB_MAP_TEXT`. v1 view-data → inline error UI ("cannot be opened in gamev2"). Builds `AssetLoader` from `baseUrl`.
- **`BabylonJsProvider`** — creates `Engine`, `Scene`, `ArcRotateCamera`. Renders the `<canvas>` absolutely-positioned full-screen behind UI. `Shift+Ctrl+Alt+I` toggles Babylon Inspector (`SceneInspectorToggle`). Uses a ref so StrictMode double-mount doesn't recreate the engine; effect cleanup deliberately does NOT dispose.
- **`GameOrchestratorProvider`** — constructs `GameRenderer` + `GameStore` + `GameOrchestrator`, calls `initialise(renderMap)`, then publishes `GameStoreContext` and `UserActionDispatchContext`. Both StrictMode mounts await the same `initPromiseRef` — without this the second mount would publish before init resolves, leaving children with `null` `store.game`.
- **`CursorProvider`** — global `mousemove` cursor pos for tooltip positioning.

### App layout

`src/ui/App.tsx` slots Fluent UI panels into a CSS grid `Frame`:
- Header: `TurnSelector`
- LeftColumn: `PlayerLeaderboard`
- RightColumn: `GameSettingsPanel`, `SelectedSlot` (`ResolutionPanel` + `SelectedInfoPanel`)
- Footer: `FpsCounter`, `ActionBar`
- Floating: `NextPlayerPopup`, `VictoryPopup`, `Tooltip`

Components consume state via `useGameStore(selector)` and dispatch via `useDispatch()` (returns `(cmd: Command) => void`). Both throw if used outside `GameOrchestratorProvider`. Components reading the active player should use `useGameStore(selectCurrentPlayerId)` rather than digging into `phase` directly.

## Providers (`src/providers`)

Implementations of `GameProvider`. Selected by `GameSessionProvider` from URL params.

| URL                                   | Provider             | Persistence                          | Resolve                             |
|---------------------------------------|----------------------|--------------------------------------|--------------------------------------|
| no `gameId`                           | `createStubProvider` | in-memory `GameData` over stub map   | unsupported (`waitForTurn` throws)   |
| `?gameId=…&userId=…&local=true`       | `LocalGameProvider`  | `localStorage` key `graph-battles-{gameId}` (shared with lobby) | sync inside `action()` when all ready |
| `?gameId=…&userId=…`                  | `APIGameProvider`    | REST via `GameApiClient`; per-player pending actions cached in `localStorage` key `graph-battles-v2-actions-{gameId}-{playerId}` | poll `get()` every 10s until `game.turn > currentTurn` |

`GameProvider` interface:
- `get(): Promise<Game>` — pull state. API impl replays pending local actions on top before returning.
- `action(playerId, action): Promise<Game>` — record action. API caches to `PlayerActionStorage`; on `ready-player` flushes cache to `api.putPlayerActions`. **Keyed by `playerId`, not `userId`** (matches API's per-player endpoint, mirrors v1 fix `812bfb9`).
- `getMapText(): Promise<string>` — v2 map text via `unwrapV2MapText` from `@battles/api/client`. Throws if stored view-data is v1.
- `waitForTurn(currentTurn): Promise<Game>` — Local: read storage once, throw if not advanced. API: poll. Stub: throw.

`LocalGameProvider.action` resolves the turn synchronously (`game.resolveTurn()`) when every player is `ready`, then writes back. So `waitForTurn` for local = read-once.

`APIGameProvider` requires `get()` before `action()` (caches `cachedGameData` for action-time `Game` reconstruction).

## Conventions / gotchas

- Every state-shape mutation goes through `dispatch(action: StateChange)`. The reducer enumerates all permitted transitions — add new variants there. Don't reintroduce a `setState(partial)` escape hatch.
- `GameMap` is mutated in place. The reducer bumps `mapRevision` for `map/mutated` and any action that replaces the map. Consumers diff on revision, not on map reference.
- Syncers reach the store via narrow `Subscribable<...State>` slices typed per consumer. Selectors are generic (`<S extends ...State>`) so each consumer's slice satisfies the selectors it calls. Don't widen consumer slices to `StoreState` — it loses the read-tracking property.
- Consumers depend on capability interfaces (`StateDispatcher`, `AnimationTracker`, `Subscribable<T>`), not on the concrete `GameStore`. Only `GameOrchestrator` imports `GameStore`. Keep it that way.
- `set-turn` carries `currentPlayerId` across phases via `selectResolvedCurrentPlayerId`. If you add a phase, decide whether to keep this carrying or fall back to `playablePlayerIds[0]`.
- `playablePlayerIds` is derived (`selectPlayablePlayerIds(state)`), not stored. Don't add a stored copy — keep it computed.
- Handlers early-return for illegal `(phase, command)` pairs rather than throwing — input races (clicks during transitions) are normal. Don't change to throw without auditing renderer click sources.
- Adding a new command: add variant to `Command` union in `state/types.ts`, add a file under `handlers/`, export from `handlers/index.ts`, add a `case` to the `handle` switch in `GameOrchestrator`. TS exhaustiveness flags missing cases.
- Adding a phase with async lifecycle: build a self-subscribing listener (mirror `WaitForTurnResolutionListener` / `ReplayingListener`) — owns its own `AbortController` and internal state, takes a narrow `Subscribable<...State>`, fires entry/exit by tracking `lastPhase`. Don't add side-effect calls in handlers when a phase-tied listener fits.
- Replay → replay same-type transitions are detected via `state.map` reference inequality, not phase identity. The reducer constructs a fresh `GameMap` on turn-scrub actions. Don't reuse `GameMap` instances across scrubs — would silently break session boundary detection.
- `Utils.clone`-ed past-turn snapshots are required for replay scrubbing so generator mutations don't poison `game.data.maps[*]`.
- StrictMode: orchestrator + babylon engine use refs and skip cleanup-dispose. If you add disposal, gate it on production or rework with a single-mount pattern.
- v1/v2 view-data envelope: lobby writes versioned data; v1 only reads v1. v2 only reads v2 — `unwrapV2MapText` throws `'v1-view-data'` on mismatch and `GameSessionProvider` renders an inline error.
- `nohoist` for `@battles/game/**` in root `package.json` — gamev2 deps are hoisted normally; don't move gamev2 packages under that nohoist.
- No tests. Validate UI by running `yarn workspace @battles/gamev2 dev` and exercising the feature.
- Resolution animation coverage is partial — `combat`/`food`/`gold`/`add-defend` are silent. Extend the relevant syncer (`UnitSyncer` for unit-focused resolutions, `TerritorySyncer` for territory-focused) and the camera focus mapping in `CameraSyncer.getResolutionFocusTerritory` together.
- `currentPlayerId` initialisation from not-ready players — preserve this on changes (commit `01d7e88`); otherwise refresh-mid-turn lands on the wrong player.
- Don't commit `dist/`, `package.zip`, or `tsconfig.tsbuildinfo`.

## React↔Babylon integration

There are two distinct kinds of React↔Babylon coupling; pick the right pattern for each:

**Heavyweight resource creation** (Engine, Scene, GameOrchestrator, GameRenderer) — these are expensive to create and must not be double-created under StrictMode's double-mount. Pattern: ref-singleton inside the relevant provider (`contextRef.current == null` guard, no dispose on cleanup). Already in place in `BabylonJsProvider` and `GameOrchestratorProvider`. Don't add disposal logic without a single-mount design.

**Lightweight observable subscriptions** (frame ticks, scene events, mesh events) — cheap to add/remove; the standard React effect add/remove-on-cleanup pattern works perfectly under StrictMode. Use the helpers in `src/ui/hooks/`:

- `useFrameTick(callback)` — registers `callback` on `scene.onBeforeRenderObservable`. Fires every frame. Callback stored in a ref so it always calls the latest closure without re-registering.
- `useBabylonObservable(observable, callback)` — generic version for any `Observable<T>`.

Both are StrictMode-safe: each mount adds its own observer, removes only that observer on cleanup. No ref-singleton needed.

**React → Babylon game-logic writes** — route through `HandlerContext` (`dispatch`, `applyAction`, `advanceResolution`). Handlers call `renderer.*` via the context; components call `useDispatch()`. Don't reach into the renderer directly from components unless it's purely a read for rendering data.

**Babylon → DOM per-frame (markers)** — `MarkerLayer` uses `useFrameTick` to run a projection loop each frame. It writes `style.transform` and `style.visibility` directly via refs — never through React state. Idle optimisation: the loop compares camera scalars, viewport size, `mapRevision`, and `pendingAnimations.length` against cached last-frame values and bails out early when nothing changed. This cuts per-frame work to ~1 μs when the board is static.

**Rule of thumb**: if the update fires at 60 fps, write to DOM refs directly. If it fires on discrete state changes (game actions, phase transitions), use `useGameStore` selectors.
