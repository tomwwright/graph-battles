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
| Resolution | Generator yields Resolution | Generator yields animate/stateUpdate | Generator yields (bridge both) |
| Build | Webpack 2 | Vite | Vite |
| UI Framework | Rebass 1 + styled-components | Inline styles | CSS Modules |
| Game Logic | Inline in stores + @battles/models | Self-contained | @battles/models |

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
- **Rendering pipeline**: `SceneRendering` — directional + hemispheric lighting, cascaded shadows, SSAO, depth of field, skybox, ground mirror
- **Camera**: `CameraController` — ArcRotateCamera with bounds, smooth rotation animation, map centering
- **Grid rendering**: `HexagonGridController` — hex mesh creation, overlay system, hover/click interaction via ActionManager
- **Hex composition**: `HexComposition` — coordinate transforms (offset, axial, hex), hex-to-tile mapping for multi-tile hexagons
- **Asset loading**: `MapLoader` — GLB model loading and tile placement
- **Unit rendering**: `UnitRenderer` — unit mesh creation, movement animation with easing
- **Bridge pattern**: `GameBridge` + `GameStore` + `ResolutionRunner` — orchestration layer between game logic and rendering
- **React state hook**: `useGameStore` — `useSyncExternalStore` selector pattern

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

This eliminates the old `ViewData` x/y system entirely. Territory positions are their hex coordinates in the grid. The `MapLoader` becomes generic over cell type `T`, where `T = Territory` for gamev2.

Parsing produces:
- A `HexCoord` for each Territory
- An edge list derived from shared grass adjacency
- The data needed to construct a `GameMap` (territories, edges, connectivity)

5. **Map format and parser**
   - Define text format: `T` = territory, `g` = grass, `_` = empty
   - Parser reads grid → assigns each `T` cell a `HexCoord` and sequential territory ID
   - Edge derivation: for each `g` cell, find all adjacent `T` cells; every pair of those territories gets an edge
   - Output: territory coordinates + edge list, sufficient to construct `GameMapData`

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

8. **Port MapLoader** from `hex-game/src/rendering/MapLoader.ts`
   - Generic over cell type `T` — for gamev2, `T = Territory`
   - GLB asset loading for tile types (grass, forest, village, farm, fort, city, castle)
   - Tile placement: iterate hex grid, compute `TerritoryComposition` for each territory cell, place 7 tile meshes per hex cluster
   - Grass cells: place 7 grass tile meshes
   - Support mesh replacement when territory properties change (swap old tiles for new composition)

9. **Render territory labels and ownership**
   - Territory ID / name labels (BabylonJS GUI or mesh-based text)
   - Player ownership indicated by colour tinting or flag meshes
   - Territory property indicators (farm, city, fort, castle) via distinct GLB models or visual markers

**Deliverable**: Game map renders from `@battles/models` GameMap data with clickable territories.

### Phase 3: State Management Bridge

Port hex-game's bridge pattern and wire it to `@battles/models`.

10. **Create GameStore** adapted from `hex-game/src/bridge/GameStore.ts`

   Store state shape:
   ```typescript
   type StoreState = {
     game: Game                          // from @battles/models
     map: GameMap                        // current turn's map state
     currentPlayerId: ID
     turn: number
     turnPhase: 'planning' | 'ready' | 'replaying' | 'victory'
     visibilityMode: VisibilityMode
     selectedUnitIds: ID[]
     selectedTerritoryId: ID | null
     hoveredTerritoryId: ID | null
     currentResolution: Resolution | null
   }
   ```

   Pub/sub with `subscribe()` / `getState()` for `useSyncExternalStore`.

11. **Create useGameStore hook** from `hex-game/src/ui/useGameStore.ts`
    - Selector-based subscriptions
    - Derived/computed selectors for visibility, valid destinations, combat state

12. **Create GameBridge** adapted from `hex-game/src/bridge/GameBridge.ts`
    - Owns GameStore + renderer references
    - Handles tile click → select unit / move unit / select territory flow
    - Submits actions via GameProvider
    - Coordinates resolution replay

13. **Create ResolutionRunner** adapted from `hex-game/src/bridge/ResolutionRunner.ts`
    - Consumes `resolveTurn()` generator from `@battles/models`
    - On `Resolution` yield: update store state, trigger renderer animation, auto-skip invisible steps
    - Support step-by-step advance (user clicks "Resolve Next") and auto-play modes

**Deliverable**: Game state flows from models through store to React and renderer.

### Phase 4: Unit Rendering and Interaction

14. **Port UnitRenderer** from `hex-game/src/rendering/UnitRenderer.ts`
    - Unit mesh creation at territory positions
    - Player colour tinting
    - Status indicators (defend shield, starve icon)
    - **Movement animation**: lerp unit position along the path. Movement between territories goes through the connecting grass hex in two segments: territory center → grass center → destination territory center
    - **Unit arrangement when coexisting**: when multiple units share a territory, arrange them in a grid layout centered on the territory position (port from `@battles/game` `UnitView.onUpdatePosition()` at `packages/game/src/game/phaser/unit.ts:161-206`):
      - Grid of up to `UNITS_PER_ROW = 3` columns
      - `UNITS_SPACING = 0.2` gap multiplier between units
      - Grid centered on territory center position
      - Animate units smoothly to new grid positions when arrangement changes (units arrive/depart)

15. **Implement unit interaction**
    - Click to select/multi-select units (port logic from `UiStore.onClickUnit`)
    - Show valid destination territories as hex overlay highlights
    - **Also highlight the connecting grass hex** between the selected unit's territory and each valid destination, so the path is visually clear
    - Click destination to queue move via `applyMoveUnits()`
    - **Planned move lines**: render as two line segments routed through the connecting grass hex center (territory → grass center → destination), not a single straight line

16. **Implement territory interaction**
    - Click territory to select and show details
    - Show available territory actions for current player
    - Queue territory action via `applyTerritoryAction()`

**Deliverable**: Units render, can be selected, and moved. Territory actions can be queued.

### Phase 5: React UI Panels

18. **Game info panel** (port from `GameInfo.tsx`)
    - Turn selector (slider or stepper)
    - Player list with colours, gold, victory points
    - Current turn phase indicator

19. **Selected info panel** (port from `SelectedInfo.tsx`, `UnitInfo.tsx`, `TerritoryInfo.tsx`)
    - Selected unit details: location, food consumption, statuses, cancel move button
    - Selected territory details: owner, food/gold production, properties, available actions with costs

20. **Resolution replay panel** (port from `ResolveInfo.tsx`)
    - Current resolution phase display
    - "Resolve Next" button
    - Auto-play toggle
    - Combat details during combat phase

21. **Game flow popups** (port from `NextPlayerPopup.tsx`, `ReadyPopup.tsx`, `VictoryPopup.tsx`)
    - "Next Player" popup between planning turns
    - "Ready" button to end planning phase
    - Victory screen

**Deliverable**: Full game UI with sidebars and popups overlaid on 3D scene.

### Phase 6: Providers, Map, and Deployment

22. **Port GameProvider interface** from `packages/game/src/game/providers/base.ts`
    - `get()`: Fetch game state
    - `action()`: Submit player action
    - `create()`: Create new game

23. **Port LocalGameProvider** from `packages/game/src/game/providers/local.ts`
    - Browser localStorage persistence
    - Client-side turn resolution

24. **Port APIGameProvider** from `packages/game/src/game/providers/api.ts`
    - REST calls to `@battles/api` Lambda backend
    - Polling for resolved turns

25. **Author a small map**
    - Create one small map in the new text grid format for development and testing
    - Should exercise edge derivation (territories connected via grass cells in various configurations)
    - Include enough territories for a 2-player game (6–8 territories)

26. **Add deployment to `@battles/ops`**
    - Add gamev2 deployment configuration to the existing CDK infrastructure in `packages/ops`
    - Do not modify or remove the existing @battles/game deployment

**Deliverable**: Playable game with local provider, sample map, and deployed infrastructure.

Note: Lobby app is out of scope for this implementation. The game will load directly with a hardcoded or URL-parameterised map and player configuration.

### Phase 7: Polish

27. **Visibility / fog of war**
    - Compute visible territories from current player's unit positions
    - Dim or hide non-visible territories (material alpha or mesh visibility)
    - Auto-skip non-visible resolution steps during replay

28. **Asset creation**
    - GLB models for territory types: unsettled, settled, farm, city, fort, castle
    - Unit models per player colour (or tinted generic model)
    - Status effect indicators

29. **Testing**
    - Port/adapt existing model tests (already in `@battles/models`)
    - Bridge and store unit tests (follow hex-game's `Actions.test.ts` pattern)
    - Integration tests for game flow
  
## Key Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| State management | `useSyncExternalStore` pub/sub | Proven in hex-game, no MobX dependency, React 19 native |
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
