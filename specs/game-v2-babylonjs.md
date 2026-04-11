# Game V2: BabylonJS Replacement for @battles/game

## Context

`@battles/game` is the existing game UI package — a turn-based territorial strategy game rendered with Phaser CE 2.7, React 15, MobX 3, and Webpack 2. These dependencies are severely dated and the application is already flagged for replacement (see `specs/refactor-resolver-logic-and-state.md`).

The sibling repository `hex-game` is a proof-of-concept that validates BabylonJS 9 + React 19 as a rendering stack. It demonstrates:

- BabylonJS scene setup with React context integration
- 3D hex grid rendering with hover/click interaction
- Generator-based action resolution with async animation yields
- State management via `useSyncExternalStore` (no MobX)
- Vite-based build tooling

`@battles/gamev2` will replace `@battles/game` by porting the game's UI and interaction layer to the technologies proven in `hex-game`, while reusing `@battles/models` for game logic.

## Architecture Comparison

| Concern | @battles/game (current) | hex-game (PoC) | @battles/gamev2 (target) |
|---|---|---|---|
| 3D Engine | Phaser CE 2.7 (2D sprites) | BabylonJS 9 (3D meshes/GLB) | BabylonJS 9 |
| React | 15 | 19 | 19 |
| State | MobX 3 (GameStore, UiStore, PhaserStore) | Custom pub/sub + useSyncExternalStore | Custom pub/sub + useSyncExternalStore |
| Resolution | Generator yields Resolution | Generator yields animate/stateUpdate | Generator yields (orchestrator coordinates) |
| Build | Webpack 2 | Vite | Vite |
| UI Framework | Rebass 1 + styled-components | Inline styles | CSS Modules |
| Game Logic | Inline in stores + @battles/models | Self-contained | @battles/models |

## Rendering Architecture

The rendering layer is orchestrator-driven (not reactive). The orchestrator pushes updates to the renderer imperatively, giving precise control over animation sequencing during resolution replay. No rendering class subscribes to state.

### Rendering Classes

| Class | Responsibility | Dependencies |
|---|---|---|
| **GameRenderer** | Facade; only rendering interface the orchestrator uses. Delegates calls to internal classes, handles cross-cutting concerns (e.g. shadow registration for new meshes). | Owns all classes below |
| **SceneRenderer** | Lighting (directional + hemispheric), cascaded shadows, SSAO, skybox, ground plane. | Scene, Camera |
| **CameraController** | ArcRotateCamera bounds, panning, 60-degree rotation animation, `focusOn()` and `centerOnMap()`. | Camera |
| **HexGridController** | Creates tile-level hex meshes for hit detection. Overlay material system (colour/alpha per tile). Maps tile clicks to territory IDs. Fires territory click/hover callbacks. | Scene, HexCoordinates |
| **AssetLoader** | Loads and caches GLB models by tile type. Provides mesh instances on demand (cloned from cached originals). | Scene |
| **MapRenderer** | Places 7 tile meshes per hex cell using coordinate + composition lookups. Swaps meshes when territory properties change. | Scene, HexGridController, HexCoordinates, TerritoryComposition, AssetLoader |
| **UnitRenderer** | Creates/removes unit meshes. Grid arrangement when multiple units share a territory. Movement animation through grass hex centers. Status indicators, planned move lines. | Scene, HexGridController, HexCoordinates, AssetLoader |

### Utility Modules (stateless, no BabylonJS)

| Module | Responsibility | Used by |
|---|---|---|
| **HexCoordinates** | Hex↔tile coordinate transforms, world position conversions. | HexGridController, MapRenderer, UnitRenderer, GameOrchestrator |
| **TerritoryComposition** | Territory properties → 7 tile types, diff between property sets. | MapRenderer |

### Data Flow

```
User clicks tile in BabylonJS
  → HexGridController callback
  → GameRenderer.onTerritoryClick callback
  → GameOrchestrator handles interaction logic
  → Updates GameStore (selection, move, action)
  → Calls GameRenderer methods (overlays, unit updates)
  → GameStore notifies subscribers
  → React UI re-renders via useGameStore

Resolution replay:
  → ResolutionRunner iterates resolveTurn() generator
  → Checks visibility (skip invisible)
  → Calls GameRenderer.focusOn() (await)
  → Calls GameRenderer.animateUnitMove() (await)
  → Updates GameStore (currentResolution, map)
  → React UI shows resolution details
  → Waits for user "next" click or auto-timer
```

## State Management Architecture

The state layer uses a pub/sub store consumed by React via `useSyncExternalStore`. The orchestrator is the only class that writes to both the store and the renderer — it is the seam between state and visuals.

### State Management Classes

| Class | Responsibility | Dependencies |
|---|---|---|
| **GameStore** | Pub/sub state container. Holds all game and UI state. Exposes `getState()` / `subscribe()` for `useSyncExternalStore`. No game logic, no rendering knowledge. Every mutation produces a new shallow copy of `StoreState` so that `useSyncExternalStore` detects changes even when the inner `GameMap` reference is the same (in-place mutation during resolution). | None |
| **GameOrchestrator** | Central coordinator. Owns GameStore, GameRenderer, ResolutionRunner, GameProvider. Handles input (click → select/move/action logic), action submission, turn flow state machine (next player → planning → ready → resolve → next turn), and post-resolution sync. | GameStore, GameRenderer, ResolutionRunner, GameProvider |
| **ResolutionRunner** | Drives the `resolveTurn()` generator. Maps each `Resolution` type to the appropriate store updates and renderer calls (e.g. `move` → `animateUnitMove`, `combat` → update territory state, `territory-action` → `updateTerritoryComposition`). Checks visibility to skip invisible resolutions. Supports step-by-step advance, auto-play, skip-to-end, and abort via `AbortSignal`. | GameStore, GameRenderer (direct references, passed by orchestrator at construction) |
| **GameProvider** | Interface for submitting actions and fetching game state. Implementations: `LocalGameProvider` (localStorage + client-side resolution), `APIGameProvider` (REST calls to Lambda backend). | External (localStorage or API) |
| **useGameStore** | React hook wrapping `useSyncExternalStore` with selector pattern. Components call `useGameStore(s => s.turnPhase)` to subscribe to specific slices of state. | GameStore |
| **UserActionDispatch** | Interface for actions React components can trigger. The orchestrator implements it; provided to components via `UserActionDispatchContext`. | GameOrchestrator |
| **GameContextProvider** | React component that composes the context providers. Creates the orchestrator from `useBabylonJs()` context, calls `orchestrator.initialise()`, then provides `GameStoreContext` and `UserActionDispatchContext` to children. | GameOrchestrator, BabylonJsProvider |

### React Component Tree

```
<BabylonJsProvider>              ← creates engine, scene, camera; renders canvas
  <GameContextProvider>          ← creates orchestrator, waits for init
    <App UI components />        ← reads useGameStore(), calls useUserActionDispatch()
  </GameContextProvider>
</BabylonJsProvider>
```

`GameContextProvider` provides two contexts:
- `GameStoreContext` — the store instance, consumed by `useGameStore(selector)`
- `UserActionDispatchContext` — the dispatch object, consumed by `useUserActionDispatch()`

The orchestrator itself is not exposed to components. They can only read state and dispatch user actions.

### Store State Shape

```typescript
type StoreState = {
  // Game state
  game: Game                          // from @battles/models
  map: GameMap                        // current turn's map — mutated in place during resolution
  currentPlayerId: ID
  turn: number

  // UI phase
  turnPhase: 'planning' | 'ready' | 'replaying' | 'victory'

  // Selection
  selectedUnitIds: ID[]
  selectedTerritoryId: ID | null
  hoveredTerritoryId: ID | null

  // Resolution replay
  currentResolution: Resolution | null

  // Visibility
  visibilityMode: VisibilityMode
}
```

Derived state (visible territory set, valid move destinations, active combats) is computed in selector functions passed to `useGameStore`, not in the store itself.

### Resolution Replay Sequence

`resolveTurn()` yields each `Resolution` **before** applying the mutation. The next call to `generator.next()` applies the mutation. This gives the runner a window to read pre-mutation state.

```
generator.next()
  → Resolution N yielded (map unchanged — describes what's about to happen)
  → Runner reads pre-mutation state from map (e.g. unit's current position)
  → Updates store.currentResolution so React UI shows what's about to happen
  → Focuses camera on subject (await)
  → generator.next() — mutation N applied, Resolution N+1 yielded
  → Runner reads post-mutation state from map
  → Triggers renderer animation from pre-state to post-state (await)
  → Notifies store so React UI updates with post-mutation state
  → Waits for user "Resolve Next" click (or auto-advance timer)
  → Repeat with Resolution N+1

First step: first next() yields Resolution 1 with no prior mutation.
Last step: final next() applies last mutation, generator completes — runner
           must still animate/render this final mutation.
```

### Resolution Runner Control

The orchestrator controls the runner via two mechanisms:

**Advance promise**: The orchestrator holds a resolve function for a promise that the runner awaits between steps. `UserActionDispatch.onResolveNext()` resolves it with `'next'`. Skip resolves it with `'skip'`.

**AbortSignal**: The orchestrator passes an `AbortSignal` into `run()`. The runner threads this signal through to renderer animation calls. When the orchestrator needs to abort (e.g. user jumps to a different turn), it aborts the signal.

```typescript
class ResolutionRunner {
  constructor(store: GameStore, renderer: GameRenderer)

  async run(
    generator: Generator<Resolution>,
    waitForAdvance: () => Promise<'next' | 'skip'>,
    signal: AbortSignal
  ): Promise<void>
}
```

Behaviour on each signal:
- **`next`**: animate and advance one step
- **`skip`**: drain the generator without animations, apply all remaining mutations, sync final state to renderer
- **`abort` (signal aborted)**: stop immediately, don't drain the generator — the orchestrator will load different state

### Input Routing

User input comes from two sources: BabylonJS scene interactions and React UI controls. Both route to the orchestrator.

**BabylonJS scene clicks and hover:**

```
HexGridController (ActionManager on tile meshes)
  → GameRenderer (callback, maps tile coord → territory ID via HexCoordinates)
  → GameOrchestrator (decision logic: select/move/action)
```

`GameRenderer` exposes `onTerritoryClick(cb)` and `onTerritoryHover(cb)`. The orchestrator registers these during initialisation. The coordinate mapping from tile to territory is the renderer's responsibility — the orchestrator only receives territory IDs.

**React UI controls:**

A `UserActionDispatch` interface exposes the actions React components can trigger:

```typescript
type UserActionDispatch = {
  onReadyPlayer(): void
  onResolveNext(): void
  onSetTurn(turn: number): void
  onTerritoryAction(territoryId: ID, action: TerritoryAction): void
  onCancelMove(unitIds: ID[]): void
}
```

The orchestrator implements this interface. A React context (`<UserActionDispatchContext.Provider>`) provides it to components. Components access it via `useUserActionDispatch()`.

**Summary:**

```
BabylonJS scene clicks:
  HexGridController → GameRenderer callback → GameOrchestrator

React UI controls:
  Component → useUserActionDispatch() → GameOrchestrator

Both paths:
  GameOrchestrator → updates GameStore + calls GameRenderer
```

## What to Port from Each Source

### From `@battles/models` (reuse directly)

The models package is the authoritative source for game logic. `gamev2` consumes it as a dependency, same as the current game.

- `GameMap`, `Territory`, `Unit`, `Edge`, `Player`, `Combat` models
- `resolveTurn()` generator and `Resolution` type
- `Values` enums (TerritoryAction, TerritoryProperty, Status, Colour)
- Action application: `applyMoveUnits()`, `applyTerritoryAction()`, `applyReadyPlayer()`
- `GameData`, `GameMapData` types

### From `hex-game` (port architecture and rendering)

- **BabylonJS setup**: `BabylonJsProvider` context pattern — engine, scene, camera initialisation with React lifecycle management
- **Rendering pipeline**: `SceneRendering` → `SceneRenderer` — directional + hemispheric lighting, cascaded shadows, SSAO, depth of field, skybox, ground mirror
- **Camera**: `CameraController` — ArcRotateCamera with bounds, smooth rotation animation, map centering
- **Grid rendering**: `HexagonGridController` → `HexGridController` — hex mesh creation, overlay system, hover/click interaction via ActionManager
- **Coordinate transforms**: `HexComposition` → `HexCoordinates` — offset, axial, hex coordinate conversions, hex-to-tile mapping
- **Asset loading**: `MapLoader` → split into `AssetLoader` (GLB loading/caching) and `MapRenderer` (tile placement)
- **Unit rendering**: `UnitRenderer` — unit mesh creation, movement animation with easing
- **Orchestration**: `GameBridge` → `GameOrchestrator` + `GameStore` + `ResolutionRunner` — orchestration layer between game logic and rendering
- **React state hook**: `useGameStore` — `useSyncExternalStore` selector pattern
- **React input routing**: new `UserActionDispatch` interface via React context

### From `@battles/game` (port game-specific UI and interaction)

- **Game flow**: Turn phases (planning → ready → resolve → replay), multi-player hot-seat flow, next-player popup
- **UI panels**: GameInfo sidebar (turn select, player list, victory points), SelectedInfo sidebar (unit/territory details), ResolveInfo (resolution step display)
- **Visibility system**: Fog-of-war computed from player unit positions, auto-skip invisible resolution steps during replay
- **Territory actions UI**: Action selection for territories (build settlement/farm/city/fort/castle, create unit) with cost display
- **Unit selection**: Multi-select units, valid destination highlighting, cancel move
- **Providers**: GameProvider interface with local/API/mock implementations

## Plan

### Phase 1: Package Scaffold and BabylonJS Setup

Create `packages/gamev2` with Vite + React 19 + BabylonJS 9 + TypeScript.

1. **Initialise package** at `packages/gamev2/`
   - `package.json` with dependencies: `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/inspector`, `react`, `react-dom`, `@battles/models`
   - `vite.config.ts` with React plugin
   - `tsconfig.json` extending root config
   - Add to root `workspaces`

2. **Port BabylonJS provider** from `hex-game/src/BabylonJsProvider.tsx`
   - Engine + Scene + ArcRotateCamera initialisation
   - React context with `useBabylonJs()` hook
   - Canvas lifecycle management (StrictMode-safe via ref caching)

3. **Port scene rendering** from `hex-game/src/rendering/SceneRendering.ts`
   - Lighting (directional + hemispheric)
   - Shadows (CascadedShadowGenerator)
   - SSAO pipeline
   - Skybox and ground plane

4. **Port camera controller** from `hex-game/src/rendering/CameraController.ts`
   - ArcRotateCamera with bounds and panning
   - Smooth rotation animation (60-degree increments)
   - `centerOnMap()` and `focusOn()` methods

**Deliverable**: Empty 3D scene renders in browser with camera controls.

### Phase 2: Map Format, Composition, and Grid Rendering

#### Board layout via hex map format

Maps are defined as text grids of hex cells. Each cell is either a **Territory** (`T`) or **grass** filler (`g`). Edges between territories are derived from adjacency: two Territories share an edge if they are both adjacent to the same grass cell.

```
Example:  T g T      ← Territories 1 and 2 connected via shared grass
          g T g      ← Territory 3 connected to 1 (top-left grass) and 2 (top-right grass)
```

This eliminates the old `ViewData` x/y system entirely. Territory positions are their hex coordinates in the grid.

5. **Map format and parser**
   - Define text format: `T` = territory, `g` = grass, `_` = empty
   - Parser reads grid → assigns each `T` cell a `HexCoord` and sequential territory ID
   - Edge derivation: for each `g` cell, find all adjacent `T` cells; every pair of those territories gets an edge
   - Output: `ParsedMap` type consumed by both the orchestrator (to construct `GameMapData`) and the renderer (to place meshes):

   ```typescript
   type ParsedMap = {
     territories: { id: ID; coord: HexCoord }[]
     grassCells: HexCoord[]
     edges: { territoryA: ID; territoryB: ID; grassCoord: HexCoord }[]
   }
   ```

   The orchestrator transforms this into `GameMapData` for `@battles/models` during initialisation. The renderer uses `territories` and `grassCells` for mesh placement, and `edges` for move path routing through grass hex centers.

#### Dynamic hex composition from Territory properties

In hex-game, `HEX_COMPOSITIONS` is a static lookup: terrain string → 7 tile types. This doesn't work for territories because their visual composition changes during gameplay as players build (SETTLED → FARM → CITY → FORT → CASTLE).

Replace with a `TerritoryComposition` class that computes the 7-tile composition from a Territory's current `TerritoryProperty[]`.

6. **TerritoryComposition class**

   Replaces `HEX_COMPOSITIONS`. Given a Territory's properties, returns the 7 `TileType` values for its hex cluster (center + 6 neighbours).

   Design:
   - Input: `TerritoryProperty[]` (from `territory.data.properties`)
   - Output: `TileType[7]` — the tile type for each of the 7 positions in the hex cluster

   Mapping rules (center tile reflects the highest-tier building, surrounding tiles show secondary features):

   | Properties | Center tile | Surrounding tiles |
   |---|---|---|
   | `[]` (unsettled) | `grass` | all `grass` |
   | `[SETTLED]` | `village` | `grass` with some `forest` |
   | `[SETTLED, FARM]` | `village` | mix of `grass` and `farm` |
   | `[SETTLED, FORT]` | `fort` | `grass` with some `forest` |
   | `[SETTLED, CITY]` | `city` | `grass` |
   | `[SETTLED, FORT, FARM]` | `fort` | mix of `grass` and `farm` |
   | `[SETTLED, CITY, FARM]` | `city` | mix of `grass` and `farm` |
   | `[SETTLED, CITY, FORT]` | `castle` | `grass` with `fort` |
   | `[SETTLED, CITY, FORT, CASTLE]` | `castle` | `grass` with some `fort` |
   | ... CASTLE + FARM | `castle` | mix with `farm` |

   New `TileType` values needed: `fort`, `city`, `castle` (in addition to existing `grass`, `forest`, `village`, `farm`, `sheep`, `rocks`).

   The class must support re-computation when properties change (after a BUILD action resolves), so the renderer can update the affected hex cluster's meshes.

   ```typescript
   class TerritoryComposition {
     /** Returns 7 tile types for the hex cluster based on territory properties */
     static compose(properties: TerritoryProperty[]): TileType[]

     /** Returns only the tiles that changed between two property sets */
     static diff(prev: TerritoryProperty[], next: TerritoryProperty[]): { index: number; tile: TileType }[]
   }
   ```

   Grass cells always compose as 7 grass tiles (no properties to vary).

#### Grid and asset rendering

7. **Port HexagonGridController** from `hex-game/src/rendering/HexagonGridController.ts`
   - Hex mesh creation (cylinder with 6 tessellation)
   - Overlay material system (color + alpha per tile)
   - Hover highlight — adapt from row/column cross to territory-aware: highlight all 7 tiles of the hovered territory's hex cluster
   - Click interaction via ActionManager — clicks on any tile within a territory's cluster select that territory
   - Clicks on grass tiles are ignored

8. **Create AssetLoader and MapRenderer** (ported from `hex-game/src/rendering/MapLoader.ts`)
   - AssetLoader: GLB asset loading and caching for tile types (grass, forest, village, farm, fort, city, castle), mesh instance creation on demand
   - MapRenderer: tile placement using HexCoordinates + TerritoryComposition, iterate hex grid and place 7 tile meshes per hex cluster
   - Grass cells: place 7 grass tile meshes
   - Support mesh replacement when territory properties change (swap old tiles for new composition)

9. **Render territory labels and ownership**
   - Territory ID / name labels (BabylonJS GUI or mesh-based text)
   - Player ownership indicated by colour tinting or flag meshes
   - Territory property indicators (farm, city, fort, castle) via distinct GLB models or visual markers

**Deliverable**: Game map renders from `@battles/models` GameMap data with clickable territories.

### Phase 3: State Management and Orchestration

Port hex-game's orchestration pattern and wire it to `@battles/models`.

10. **Create GameStore** adapted from `hex-game/src/bridge/GameStore.ts`
    - Pub/sub state container with `subscribe()` / `getState()` for `useSyncExternalStore`
    - State shape as defined in the State Management Architecture section

11. **Create useGameStore hook** from `hex-game/src/ui/useGameStore.ts`
    - Selector-based subscriptions
    - Derived/computed selectors for visibility, valid destinations, combat state

12. **Create GameOrchestrator** adapted from `hex-game/src/bridge/GameBridge.ts`
    - Owns GameStore + GameRenderer + ResolutionRunner + GameProvider
    - Handles tile click → select unit / move unit / select territory flow
    - Submits actions via GameProvider
    - Manages turn flow state machine (next player → planning → ready → resolve → next turn)
    - Coordinates resolution replay

13. **Create ResolutionRunner** adapted from `hex-game/src/bridge/ResolutionRunner.ts`
    - Consumes `resolveTurn()` generator from `@battles/models`
    - On `Resolution` yield: update store state, trigger renderer animation, auto-skip invisible steps
    - Support step-by-step advance (user clicks "Resolve Next") and auto-play modes

**Deliverable**: Game state flows from models through store to React and renderer.

### Phase 4a: Unit Rendering and Move Visualisation

Replace the Phase 3 placeholder unit meshes with the full unit rendering pipeline, and add visual feedback for planned moves and connecting grass hexes.

**Already in place from Phase 3 (placeholder):** colored-cylinder unit meshes, basic grid arrangement on shared territories, snap-to-territory on move, `addUnit`/`removeUnit`/`setUnitPosition`/`animateUnitMove` on `GameRenderer`, valid destination overlay highlights driven by `syncSelectionOverlays` in `GameOrchestrator`.

14. **Port UnitRenderer** from `hex-game/src/rendering/UnitRenderer.ts` — replace the inline placeholder logic on `GameRenderer` with a dedicated `UnitRenderer` class
    - Cylinder-based unit meshes (continue with the Phase 3 placeholder geometry; GLB models are deferred to Phase 7 asset creation)
    - Player colour tinting
    - Status indicators (defend shield, starve icon)
    - **Movement animation**: lerp unit position along the path. Movement between territories goes through the connecting grass hex in two segments: territory center → grass center → destination territory center. Currently `animateUnitMove` snaps; replace with awaitable lerp that respects the `AbortSignal` passed by `ResolutionRunner`.
    - **Unit arrangement when coexisting**: port from `@battles/game` `UnitView.onUpdatePosition()` at `packages/game/src/game/phaser/unit.ts:161-206`:
      - Grid of up to `UNITS_PER_ROW = 3` columns
      - `UNITS_SPACING = 0.2` gap multiplier between units
      - Grid centered on territory center position
      - Animate units smoothly to new grid positions when arrangement changes (units arrive/depart)

15a. **Move visualisation**
    - **Planned move lines**: render as two line segments routed through the connecting grass hex center (territory → grass center → destination), not a single straight line. Driven by each unit's pending move action; updates on selection and on action submission.
    - **Highlight connecting grass hex**: when valid destinations are highlighted for selected units, also highlight the grass hex(es) along the connecting edge so the path is visually clear. Extends the existing `syncSelectionOverlays` overlay logic.

**Deliverable**: Units render with proper meshes and player colours, animate smoothly through grass hexes during moves, and planned moves are visible as routed lines with their grass paths highlighted.

### Phase 4b: Unit and Territory Interactions

Wire up the remaining direct-interaction surfaces. Most of the orchestration logic for these flows already exists from Phase 3 (`handleTerritoryClick`, `onTerritoryAction`, `onCancelMove`); this phase adds the missing input handling and UI affordances.

**Already in place from Phase 3:** territory click → select territory + auto-select owned units, click adjacent territory to move selected units, valid destination calculation, `onTerritoryAction`/`onCancelMove` dispatch methods.

15b. **Direct unit interaction**
    - Click directly on a unit mesh to select/multi-select individual units (port logic from `UiStore.onClickUnit`). Currently selection happens at the territory level — clicking a territory selects *all* of the current player's units on it. Adding mesh-level click handling allows finer-grained control.
    - Cancel move affordance: surface `onCancelMove` via UI for selected units that have a pending move

16. **Territory action surfacing**
    - Click territory to select and show details (already done — selection state exists)
    - Show available territory actions for the current player on the selected territory (cost display, disabled state when unaffordable)
    - Wire the action buttons to `onTerritoryAction` (dispatch already implemented)
    - Note: the actual side panels are built in Phase 5; this item ensures the data and dispatch surface is complete and validated end-to-end via a minimal inline UI if Phase 5 hasn't started yet.

**Deliverable**: Individual units can be selected by clicking their meshes, planned moves can be cancelled, and territory actions can be queued from the UI.

### Phase 5: React UI Panels

17. **Game info panel** (port from `GameInfo.tsx`)
    - Turn selector (slider or stepper)
    - Player list with colours, gold, victory points
    - Current turn phase indicator

18. **Selected info panel** (port from `SelectedInfo.tsx`, `UnitInfo.tsx`, `TerritoryInfo.tsx`)
    - Selected unit details: location, food consumption, statuses, cancel move button
    - Selected territory details: owner, food/gold production, properties, available actions with costs

19. **Resolution replay panel** (port from `ResolveInfo.tsx`)
    - Current resolution phase display
    - "Resolve Next" button
    - Auto-play toggle
    - Combat details during combat phase

20. **Game flow popups** (port from `NextPlayerPopup.tsx`, `ReadyPopup.tsx`, `VictoryPopup.tsx`)
    - "Next Player" popup between planning turns
    - "Ready" button to end planning phase
    - Victory screen

**Deliverable**: Full game UI with sidebars and popups overlaid on 3D scene.

### Phase 6: Providers, Map, and Deployment

21. **Port GameProvider interface** from `packages/game/src/game/providers/base.ts`
    - `get()`: Fetch game state
    - `action()`: Submit player action
    - `create()`: Create new game

22. **Port LocalGameProvider** from `packages/game/src/game/providers/local.ts`
    - Browser localStorage persistence
    - Client-side turn resolution

23. **Port APIGameProvider** from `packages/game/src/game/providers/api.ts`
    - REST calls to `@battles/api` Lambda backend
    - Polling for resolved turns

24. **Author a small map**
    - Create one small map in the new text grid format for development and testing
    - Should exercise edge derivation (territories connected via grass cells in various configurations)
    - Include enough territories for a 2-player game (6–8 territories)

25. **Add deployment to `@battles/ops`**
    - Add gamev2 deployment configuration to the existing CDK infrastructure in `packages/ops`
    - Do not modify or remove the existing @battles/game deployment

**Deliverable**: Playable game with local provider, sample map, and deployed infrastructure.

Note: Lobby app is out of scope for this implementation. The game will load directly with a hardcoded or URL-parameterised map and player configuration.

### Phase 7: Polish

26. **Visibility / fog of war**
    - Compute visible territories from current player's unit positions
    - Dim or hide non-visible territories (material alpha or mesh visibility)
    - Auto-skip non-visible resolution steps during replay

27. **Asset creation**
    - GLB models for territory types: unsettled, settled, farm, city, fort, castle
    - Unit models per player colour (or tinted generic model)
    - Status effect indicators

28. **Testing**
    - Port/adapt existing model tests (already in `@battles/models`)
    - Orchestrator and store unit tests (follow hex-game's `Actions.test.ts` pattern)
    - Integration tests for game flow
  
## Key Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| State management | Single `GameStore` with `useSyncExternalStore` pub/sub | Proven in hex-game, no MobX dependency, React 19 native. One store for both game and UI state (selection, hover, phase) — simpler to reason about; split only if profiling shows hover frequency is a problem. |
| Store mutation model | Shallow copy of `StoreState` on every mutation | `GameMap` is mutated in place during resolution; shallow copy ensures `useSyncExternalStore` detects changes even when the map reference is unchanged. |
| React → orchestrator | `UserActionDispatch` interface via React context | Clean separation — React components don't reference the orchestrator directly. Small, known action set doesn't warrant a full dispatch/reducer pattern. |
| React context wiring | `BabylonJsProvider` → `GameContextProvider` (two-layer nesting) | Mirrors hex-game pattern. `GameContextProvider` provides `GameStoreContext` and `UserActionDispatchContext`. Orchestrator is not exposed to components. |
| Rendering updates | Orchestrator-driven (imperative), not reactive subscriptions | Resolution replay requires precise sequencing of animations and state updates; imperative control avoids stale-computed bugs from the MobX approach. |
| Resolution runner control | `AbortSignal` + advance promise returning `'next'` or `'skip'` | Runner needs to handle step advance, skip-to-end (drain generator without animations), and abort (user jumps to different turn, cancel in-flight animations). |
| Board layout | Text grid map format (`T`/`g`/`_`) with edge derivation from shared grass adjacency | Territories get hex coordinates natively; edges derived automatically; no separate ViewData needed |
| Hex composition | Dynamic `TerritoryComposition` class driven by `TerritoryProperty[]` | Territories change visually as players build; static lookup table can't handle this |
| UI styling | CSS Modules | Scoped styles, no runtime dependency, Vite built-in support |
| Asset format | GLB (glTF binary) | Proven in hex-game, BabylonJS native support |
| Build tool | Vite | Proven in hex-game, fast dev server, simple config |
| Animation | Unit position lerping only; no combat or building animations | Keeps scope minimal; movement through grass hex centers gives visual path clarity |
| Edge rendering | No explicit edge meshes; grass tiles between territories serve as visual connectors | Simpler rendering; move highlights and planned move lines use grass hex centers to reinforce connectivity |
| Lobby | Not included in this implementation | Out of scope; game loads directly with hardcoded/parameterised config |
| Old app | Not decommissioned; gamev2 deployed alongside via `@battles/ops` | Avoids risk; old app remains functional during transition |

## Risks

| Risk | Mitigation |
|---|---|
| Existing maps not compatible with new format | Author new maps in text grid format; old maps remain for @battles/game |
| `@battles/models` API changes from in-progress refactor | Refactor spec is partially implemented; complete remaining steps before or during gamev2 work |
| GLB asset creation bottleneck (need fort, city, castle models) | Start with primitive meshes (coloured hexagons, cylinders for units) and replace with detailed models later |
| Performance with large maps (7 tiles per hex) | BabylonJS instancing for repeated tile meshes; LOD for distant tiles; test with largest existing map early |
| Territory composition mapping complexity | Start with simple rules (center tile = highest-tier building, surround = grass); refine aesthetics iteratively |
