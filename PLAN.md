# Refactoring Plan

## 1. Upgrade TypeScript (in progress)

Upgrade TypeScript to latest major version. Avoid upgrading React, MobX, or any `game` package dependencies — that application is being replaced.

## 2. Define `Resolution` type and build generator-based resolver

Create a unified turn resolution implementation in `packages/models` using generator functions.

### 2.1 Define `Resolution` type

Create `packages/models/src/resolution.ts` with a `Resolution` type that encodes:

- Phase (move, combat, defend, food, gold, territory control, territory action)
- Affected entity IDs
- Enough context for the UI to display/animate the step

Use the existing `ResolveState` phases from `packages/game/src/game/stores/game.ts` as the taxonomy:

```
MOVES → EDGE_MOVES → COMBATS → ADD_DEFEND → FOOD → GOLD → TERRITORY_CONTROL → TERRITORY_ACTIONS
```

### 2.2 Build the generator resolver

> **Note:** `map.resolveTurn()` ends with `this.unreadyPlayers()` which clears the ready flag on all players. The generator must include this step.

Create `packages/models/src/resolver.ts` with a generator function:

```typescript
function* resolveTurn(map: GameMap): Generator<Resolution>
```

Key considerations:

- Clone initial map state internally for comparisons (defend status, territory control)
- Handle the combat loop: resolve moves → resolve combats → resolve moves again, looping until no combats remain — yielding at each step
- Yield one `Resolution` per discrete step (per unit move, per combat, per territory, etc.)
- The API consumer exhausts the generator ignoring yields; the game UI pauses at each yield

### 2.3 Export from models package

Export `Resolution` type and `resolveTurn` generator from `packages/models/src/index.ts`.

## 3. Refactor `game` to consume the generator

Replace the state machine in `packages/game/src/game/stores/game.ts`:

- Remove `ResolveState` enum, `resolveIds`, `changeResolveState()`, all `toXxxState()` and `resolveXxx()` methods
- Store the generator instance and current `Resolution` value
- "Resolve Next" button calls `.next()` on the generator
- Visibility filtering handled consumer-side: auto-advance past `Resolution` objects for non-visible entities
- `packages/game/src/game/components/ResolveInfo.tsx` displays resolution state in the UI — update alongside the store

## 4. Delete old resolution code

- Remove `resolveTurn()` and all `resolve*()` orchestration methods from `GameMap` (`packages/models/src/map.ts`)
- Remove resolution methods from `Unit`, `Territory`, `Player` that are now handled by the resolver
- Remove `Game.resolveTurn()` wrapper in `packages/models/src/game.ts`

## 5. Lift action state out of models, strip mutation logic

Action intent (moves, territory actions, readiness) is currently stored on the entities themselves (`unit.data.destinationId`, `territory.data.currentAction`, `player.data.ready`). This step lifts that state to the map level as pending action lists, and moves complex mutation logic (validation, cost calculations) out of models into the action/resolver layer. Simple data operations (add/remove from arrays, set a scalar) stay on models.

### 5.1 Lift action state to `GameMapData`

Add pending action lists to `GameMapData`:

```typescript
type GameMapData = HasID & {
  type: 'map';
  dataMap: DataMap;
  nextId: number;
  pendingMoves: PendingMove[];       // { unitId, destinationId }
  pendingTerritoryActions: PendingTerritoryAction[]; // { territoryId, action }
  readyPlayerIds: ID[];
};
```

Remove from entity data types:
- `destinationId` from `UnitData`
- `currentAction` from `TerritoryData`
- `ready` from `PlayerData`

### 5.2 Update model getters to use map-level state

- `Unit.destination` → computed lookup from `map.data.pendingMoves`
- `Unit.movementEdge` → computed lookup from `map.data.pendingMoves`
- `Territory.currentAction` → computed lookup from `map.data.pendingTerritoryActions` (if needed by UI)
- `Player.ready` → computed lookup from `map.data.readyPlayerIds` (if needed by UI)

### 5.3 Update action application

Rewrite `applyMoveUnits()`, `applyTerritoryAction()`, `applyReadyPlayer()` to write to the pending action lists on `GameMapData` instead of mutating entity data:

- `applyMoveUnits()` → adds/removes entries in `map.data.pendingMoves` (validation logic currently in `Unit.setDestination()` moves here)
- `applyTerritoryAction()` → adds/replaces entries in `map.data.pendingTerritoryActions` (validation and cost logic currently in `Territory.setTerritoryAction()` moves here)
- `applyReadyPlayer()` → adds/removes from `map.data.readyPlayerIds`

### 5.4 Update resolver to consume pending actions

- `resolveMoves()` reads from `map.data.pendingMoves` to determine which units are moving, mutates `unit.data.locationId` directly
- `resolveTerritoryActions()` reads from `map.data.pendingTerritoryActions`, executes action functions, then clears the list
- `unreadyPlayers()` clears `map.data.readyPlayerIds`
- `resolveAddDefendStatus()` / `resolveRemoveDefendStatus()` check pending moves instead of `unit.data.destinationId`

### 5.5 Strip complex mutation methods from models

| Class | Remove | Keep |
|-------|--------|------|
| **Unit** | `setDestination()`, `resolveMove()`, `resolveAddDefendStatus()`, `resolveRemoveDefendStatus()` | `addStatus()`, `removeStatus()` (simple array ops), getters |
| **Territory** | `setTerritoryAction()`, `resolveFood()`, `resolveTerritoryControl()`, `resolveTerritoryAction()` | `addProperty()`, `removeProperty()` (simple array ops), getters |
| **Player** | `resolveGold()` | Getters |
| **Combat** | `resolve()` | Getters (computed combat results) |

Mutation logic from removed methods moves into the resolver (Step 5.4) and action application (Step 5.3).

### 5.6 Keep low-level data operations on models

- `GameMap.addUnit()` / `removeUnit()` — low-level data structure ops, stay as primitives called by resolvers
- `Unit.addStatus()` / `removeStatus()` — simple array include/exclude
- `Territory.addProperty()` / `removeProperty()` — simple array include/exclude

### 5.7 Territory action resolvers

`packages/models/src/territoryActionResolvers.ts` functions (`onCreateUnit`, `onBuildSettlement`, etc.) already follow a resolver-like pattern. Move them under the resolver umbrella.

### 5.8 Update tests

Update all tests to reflect the new data structures (no `destinationId` on units, no `currentAction` on territories, no `ready` on players) and new action application paths.

> **Note:** The provider layer (`packages/game/src/game/providers/` — local, api, mock) calls `map.applyAction()`. Check these consumers when changing action application.

## Key file paths

- `packages/models/src/map.ts` — `GameMap` with `resolveTurn()`
- `packages/models/src/unit.ts` — `UnitData` type, resolve methods
- `packages/models/src/territory.ts` — territory mutations
- `packages/models/src/player.ts` — `resolveGold()`
- `packages/models/src/combat.ts` — `Combat.resolve()`
- `packages/models/src/game.ts` — `Game.resolveTurn()` wrapper
- `packages/models/src/values.ts` — enums, `TerritoryActionDefinitions`
- `packages/models/src/territoryActionResolvers.ts` — build/create functions
- `packages/models/src/actions/move.ts` — `MoveUnitsModelAction`
- `packages/models/src/utils.ts` — `Model` base class, `ID` type
- `packages/models/src/index.ts` — package exports
- `packages/game/src/game/stores/game.ts` — game store with state machine
- `packages/game/src/game/components/ResolveInfo.tsx` — resolution UI
- `packages/game/src/game/providers/` — local, api, mock providers calling `map.applyAction()`

## Model hierarchy

```
Model<T extends HasID>
├── UnitContainer<T>
│   ├── Territory extends UnitContainer<TerritoryData>
│   ├── Edge extends UnitContainer<EdgeData>
│   └── GameMap extends UnitContainer<GameMapData>
├── Unit extends Model<UnitData>
└── Player extends Model<PlayerData>
```
