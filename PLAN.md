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

## 5. Separate query and mutation — make models read-only

Strip mutation methods from model classes so only the resolver performs mutations.

### Classes to make read-only:

| Class | Remove | Keep |
|-------|--------|------|
| **Unit** | `setDestination()`, `resolveMove()`, `addStatus()`, `removeStatus()`, `resolveAddDefendStatus()`, `resolveRemoveDefendStatus()` | Getters: `destination`, `movementEdge`, `location`, `player` |
| **Territory** | `addProperty()`, `removeProperty()`, `setTerritoryAction()`, `resolveFood()`, `resolveTerritoryControl()`, `resolveTerritoryAction()` | Getters: `type`, `units`, `food`, `player` |
| **Player** | `resolveGold()` | Getters: `gold`, `territories`, `units` |
| **Combat** | `resolve()` | Getters: computed combat results |

### Action application

Move `applyMoveUnits()`, `applyReadyPlayer()`, `applyTerritoryAction()` logic into the resolver or into dedicated resolver methods. `GameMap.applyAction()` should delegate to the resolver layer.

> **Note:** The provider layer (`packages/game/src/game/providers/` — local, api, mock) calls `map.applyAction()`. Check these consumers when changing action application.

### `GameMap.addUnit()` / `removeUnit()`

These mutation methods on GameMap are used by combat resolution and territory action resolvers (`onCreateUnit`). Decision: keep these as internal primitives that only resolvers call, rather than moving the logic into the resolver itself. They are low-level data structure operations, not domain logic.

### Territory action resolvers

`packages/models/src/territoryActionResolvers.ts` functions (`onCreateUnit`, `onBuildSettlement`, etc.) already follow a resolver-like pattern. Move them under the resolver umbrella.

## 6. Remove `destinationId` from units

Replace `destinationId` on `UnitData` with `MoveAction` tracking at the `GameMap` level.

### Changes:

- Remove `destinationId` from `UnitData` type
- Add `pendingMoves: MoveAction[]` (or similar) to `GameMapData`
- `Unit.destination` getter becomes a computed lookup: find the unit's pending move in the map's move list
- `Unit.movementEdge` getter similarly uses the pending move data
- Update `applyMoveUnits()` to write to the pending moves list instead of `unit.data.destinationId`
- Resolver reads and clears pending moves during resolution
- Update tests to reflect new data structure

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
