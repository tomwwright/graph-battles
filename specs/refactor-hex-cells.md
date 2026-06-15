# Better Paths — Phase 2: HexCellMap + Navigation

Extension of [`specs/better-paths.md`](./better-paths.md). Phase 1 delivered the markdown-table parser, path-cell composition, and edge derivation. The result was emitted as a plain `RenderMap` record and consumed by renderers that did raw list manipulation. This phase replaces that record with a typed `HexCellMap`, extracts a `Navigation` projector for HexCoord → Vector3, and switches `HexGridController` to query the map directly instead of holding parallel state.

## Context

Phase 1 outcomes:

- `parseMap(text): RenderMap` returning `{ territories, pathCells, edges }`.
- `PathCell` discriminated union (`wide` | `narrow` — narrow added by [`specs/single-width-paths.md`](./single-width-paths.md)) lives in `HexCoordinates.ts`.
- `isPathDirectionOpen` lives in `HexCoordinates.ts`.
- `validateRenderMap.ts` checks `RenderMap` against `GameMapData`.

What hurts:

- `RenderMap` is a record, not a queried entity. Adjacency helpers and edge lookups (`edges.find(...)`) are scattered across `MapParser`, `UnitRenderer`, `GameRenderer`.
- `UnitRenderer` carries ~8 private methods doing hex math, edge lookup, centroid projection, and waypoint chaining. It also keeps a parallel `edgeTerritoryMap: Map<edgeId, {a, b}>` bridging `GameMap.edges[].id` to `RenderMap.edges`.
- `HexGridController` holds three derived maps (`territoryLookup`, `territoryCoords`, `edgeLookup`) reconstructed from the same `RenderMap` data via `setTerritoryMap`. Pure duplication.
- `MapParser` keeps its own local `isOpen` that diverges from `isPathDirectionOpen` (narrow case omits the CCW-prev sibling). Two sources of truth for the same predicate.
- Cell-kind geometry (`isPathDirectionOpen`, cell-kind union) lives next to pure coordinate math in `HexCoordinates.ts`. Two concerns colocated.

## Goals

- One typed map structure with query methods; remove raw list traversal from renderers.
- Index edges by ID inside the map, eliminating the duplicate `edgeTerritoryMap` in `UnitRenderer`.
- Index edges by path-cell coord, eliminating the duplicate `edgeLookup` in `HexGridController`.
- Project HexCoord → Vector3 in one place (`Navigation`); keep cell-kind awareness inside `HexCellMap`.
- Collapse divergent `isOpen` implementations into one.
- Store `HexEdge.pathCoords` in canonical T_A → T_B order at construction so no consumer needs to sort or guess endpoints.

## Non-goals

- Junction path cells (still out of scope per Phase 1).
- Multi-edge between same territory pair (still out of scope).
- Changes to map text format, composition tables, or edge-derivation flood-fill algorithm.
- Replacing `UNIT_BASE_Y` or unit grid arrangement (stays in `UnitRenderer`).

## Model changes

### Cell types

Move all cell-kind types into `src/map/HexCellMap.ts`.

```ts
export type TerritoryCell  = { kind: 'territory'; coord: HexCoord; id: ID };
export type WidePathCell   = { kind: 'wide';      coord: HexCoord; exclude: HexDirection };
export type NarrowPathCell = { kind: 'narrow';    coord: HexCoord; dirA: HexDirection; dirB: HexDirection };
export type EmptyCell      = { kind: 'empty';     coord: HexCoord };
export type HexCell        = TerritoryCell | WidePathCell | NarrowPathCell | EmptyCell;
export type PathCell       = WidePathCell | NarrowPathCell;
```

`EmptyCell` retained in the grid because the parser stores empty entries (dangling-open detection); excluded from `territories()` / `pathCells()` accessors.

### Edges indexed by ID and coord, ordered

```ts
export type HexEdge = {
  id: ID;
  territoryA: ID;
  territoryB: ID;
  /** Ordered T_A side → T_B side. See "Path ordering" below. */
  pathCoords: HexCoord[];
};
```

Edge ID built at construction using the existing convention (`#T<a>#T<b>` with numerical order, mirroring `edgeKey` in current `validateRenderMap.ts`).

### Path ordering

`pathCoords` are ordered at parse time, not at query time. Ordering algorithm:

1. Identify cells in the flood-fill component that border T_A (any open dir points at T_A's coord).
2. BFS the path-cell adjacency graph from those cells.
3. `pathCoords = bfs visit order`.

Properties:

- For a simple linear path, this yields the natural T_A → T_B traversal.
- For branchy or looping components, order is deterministic but visually approximate. Consumers do not rely on the order being a single non-branching walk; this is a gameplay-shape concern, not a renderer concern.
- T_B side queries reverse the array.
- Edge centre is the middle of the ordered array (single cell odd, midpoint pair even).

### Open-direction predicate

Single implementation in `src/map/HexCellMap.ts`:

```ts
export function isPathCellOpen(cell: PathCell, dir: HexDirection): boolean {
  if (cell.kind === 'wide') return cell.exclude !== dir;
  return cell.dirA === dir || HEX_DIR_CCW_PREV[cell.dirA] === dir
      || cell.dirB === dir || HEX_DIR_CCW_PREV[cell.dirB] === dir;
}
```

`MapParser`'s local `isOpen` is deleted. Parser edge-derivation flood-fill switches to `isPathCellOpen`. Narrow-path adjacency now correctly accounts for the CCW-prev sibling — a behavior change for the parser, intentional, consistent with rendering.

## `HexCellMap` class

`src/map/HexCellMap.ts`. Owns hex-space queries only. No `Vector3`, no `GameMapData`.

```ts
export class HexCellMap {
  constructor(
    grid: ReadonlyMap<string, HexCell>,
    territories: readonly TerritoryCell[],
    pathCells: readonly PathCell[],
    edges: readonly HexEdge[],
  );

  cellAt(coord: HexCoord): HexCell | undefined;
  territories(): readonly TerritoryCell[];
  pathCells(): readonly PathCell[];
  edges(): readonly HexEdge[];

  territoryCoord(id: ID): HexCoord | undefined;
  territoryAtCoord(coord: HexCoord): TerritoryCell | undefined;
  edgeById(id: ID): HexEdge | undefined;
  edgeBetween(territoryA: ID, territoryB: ID): HexEdge | undefined;
  /** Edge whose path includes this coord. O(1). */
  edgeAtCoord(coord: HexCoord): HexEdge | undefined;
}
```

Internal indexes (built once at construction):

- `Map<coordKey, HexCell>` — grid
- `Map<ID, TerritoryCell>` — territory by ID
- `Map<ID, HexEdge>` — edge by ID
- `Map<edgePairKey, HexEdge>` — edge by territory pair
- `Map<coordKey, HexEdge>` — edge by path-cell coord

No `isOpen(coord, dir)` method — free function + `cellAt` covers current callers.

## `Navigation` class

`src/rendering/Navigation.ts`. HexCoord → Vector3 projector. Holds `HexCellMap` + `HexGridController`. Returns ground-plane positions (`y = 0`). Callers lift as needed.

```ts
export class Navigation {
  constructor(map: HexCellMap, grid: HexGridController);

  /** Visual centre of a hex cell: territory → center tile world pos; path cell → centroid of present tiles. y = 0. */
  cellCenter(coord: HexCoord): Vector3;

  /** Centre of a game location (territory or edge by ID). Edge centre is the centroid of the middle pathCoords entry/entries. y = 0. */
  locationCenter(locationId: ID): Vector3 | null;

  /**
   * Waypoints between two locations, traversing the edge's pathCoords in the
   * correct direction. y = 0.
   *
   * - T_A → E_AB: T_A-side half of pathCoords (projected), terminating at edge centre.
   * - E_AB → T_A: above reversed (start at edge centre).
   * - T_A → T_B: full pathCoords from T_A side, projected.
   * - E → E: [].
   */
  path(fromLocationId: ID, toLocationId: ID): Vector3[];
}
```

A single `path` method covers both unit-move animation (single leg, T↔E) and destination-line drawing (full route, T→T). The T_A vs T_B side decision is data-driven: `Navigation` reads `HexEdge.territoryA` / `territoryB` and reverses `pathCoords` when needed. No sort, no axial-distance math.

Y-axis is renderer-owned. `UnitRenderer` lifts to `UNIT_BASE_Y` for unit moves and to `+0.1` for destination lines using its own `lift()` helper.

## `HexGridController` changes

`src/rendering/HexGridController.ts`. Replace `setTerritoryMap(territories, edges)` with `setMap(map: HexCellMap)`. Controller drops three internal maps:

- `territoryLookup` → `map.territoryAtCoord(coord)`
- `territoryCoords` → `map.territoryCoord(id)` + `map.territories()` (for `getBounds`)
- `edgeLookup` → `map.edgeAtCoord(coord)`

Controller's remaining state: `overlays`, `occupiedTiles`, hover state, `grid` meshes. Hover hot-path stays O(1) via the indexes inside `HexCellMap`.

## File changes

| File | Change |
|---|---|
| `src/map/HexCellMap.ts` (new) | `HexCell` union, `HexEdge`, `isPathCellOpen`, `HexCellMap` class with all indexes |
| `src/map/MapParser.ts` | `parseMap` returns `HexCellMap`; removes local `ParsedCell` and local `isOpen`; uses `isPathCellOpen`; builds `HexEdge.id` and ordered `pathCoords` via BFS from T_A border cells |
| `src/map/validateRenderMap.ts` | Renamed `validateHexCellMap.ts`; signature `validateHexCellMap(map: HexCellMap, mapData: GameMapData): void`. Logic unchanged. |
| `src/rendering/HexCoordinates.ts` | Remove `PathCell` type and `isPathDirectionOpen`. Keep all pure coordinate math (`HEX_DIRS`, `HEX_OPPOSITE`, `HEX_DIR_CCW_PREV`, `hexCenterTile`, `hexToTileCoords`, `toPathCellIndices`, `toNarrowPathCellIndices`). |
| `src/rendering/Navigation.ts` (new) | `Navigation` class with `cellCenter`, `locationCenter`, `path` |
| `src/rendering/HexGridController.ts` | `setMap(map: HexCellMap)` replaces `setTerritoryMap`; drops `territoryLookup`, `territoryCoords`, `edgeLookup` |
| `src/rendering/MapRenderer.ts` | `loadMap(map: HexCellMap, gameMap: GameMap)` — iterates `map.territories()` / `map.pathCells()` |
| `src/rendering/GameRenderer.ts` | `initialise(map: HexCellMap, gameMap: GameMap)`; grid sizing from `map.territories()` / `map.pathCells()`; constructs `Navigation`; calls `grid.setMap(map)`; `highlightWaypoints` uses `navigation.path(a, b)` |
| `src/rendering/UnitRenderer.ts` | Accepts `Navigation` in ctor; drops `map`, `territoryCoordMap`, `edgeTerritoryMap`, and the hex-math methods (`hexCentroid`, `territoryCenterPosition`, `edgeCenterPosition`, `locationCenterPosition`, `getMovementWaypoints`, `getConnectingWaypoints`, `findEdge`, `hexDistance`). `targetUnitPosition` keeps grid-offset math, uses `navigation.locationCenter` for base. |
| `src/orchestration/GameOrchestrator.ts` | `renderMap: RenderMap` → `map: HexCellMap` |
| `src/providers/StubGameProvider.ts` | `createStubGameData(map: HexCellMap)` — uses `map.territories()` / `map.edges()` |

`RenderMap` type and any external re-export are deleted.

## Consumer flow after refactor

Unit move animation:

```ts
const waypoints = this.navigation.path(fromLoc, toLoc);
const endPos = this.targetUnitPosition(unitId, toLoc); // grid-offset math, unchanged
const path: Vector3[] = [
  startPos,
  ...waypoints.map((p) => this.lift(p, UNIT_BASE_Y)),
  endPos,
];
```

Destination-line drawing:

```ts
const waypoints = this.navigation.path(state.locationId, destinationId);
const linePoints = [
  this.lift(fromPos, 0.1),
  ...waypoints.map((p) => this.lift(p, 0.1)),
  this.lift(toPos, 0.1),
];
```

Grid arrangement (`arrangeLocation`, `targetUnitPosition`) keeps row/col offset logic; calls `navigation.locationCenter(locationId)` for the base.

## Validation

`validateHexCellMap(map: HexCellMap, mapData: GameMapData)` stays a free function in `src/map/validateHexCellMap.ts`. Reasons:

- Keeps `HexCellMap` free of any `GameMapData` import — map module is hex-only.
- Cross-cutting concern (binds two schemas); no natural home on either type.
- Public API surface unchanged from Phase 1 apart from the typed parameter.

Phase 1 in-parse warnings (dangling open, isolated path cells, T-T adjacency) stay inside `MapParser` — they're parse-time, not consistency-with-`GameMapData`.

## Implementation steps

1. Add `src/map/HexCellMap.ts` with types, `isPathCellOpen`, and class. Build all internal indexes at construction. Build edge IDs via existing `#T<a>#T<b>` convention.
2. Migrate `MapParser.parseMap` to construct a `HexCellMap`. Drop local `ParsedCell` and `isOpen`. Order `HexEdge.pathCoords` via BFS from T_A-adjacent path cells. Verify edge-derivation against current fixtures — narrow-cell adjacency may pick up the CCW-prev sibling now; confirm intended.
3. Rename `validateRenderMap.ts` → `validateHexCellMap.ts`; switch parameter type. Delete `RenderMap`-aware code path.
4. Strip `PathCell` + `isPathDirectionOpen` from `HexCoordinates.ts`. Update all imports.
5. Convert `HexGridController` to `setMap(map: HexCellMap)`. Drop the three internal maps. Confirm hover/click resolution against the existing fixtures.
6. Add `src/rendering/Navigation.ts`. Implement `cellCenter` (uses `map.cellAt`), `locationCenter`, `path`. All return `y = 0`.
7. Refactor `UnitRenderer`: drop hex-math methods + `map` / `territoryCoordMap` / `edgeTerritoryMap`. Accept `Navigation` in ctor. Update animation + destination-line code paths to lift by `UNIT_BASE_Y` / `0.1`.
8. Update `MapRenderer`, `GameRenderer`, `GameOrchestrator`, `StubGameProvider` to consume `HexCellMap`.
9. Update `TerritoryComposition` callers and `TerritoryComposition.test.ts` for any cell-kind import path changes.
10. `npx tsc --noEmit` clean. `yarn test` green.

## Testing

Per Phase 1, gamev2 has no broad unit suite. Manual verification mirrors Phase 1's checks, plus:

- Unit move animation: territory → edge, edge → territory, territory → territory. Confirm waypoint count and direction match current behaviour. For T_B → E_AB and E_AB → T_B, confirm the unit traverses the correct half of `pathCoords`.
- Destination line drawing for multi-cell edges. Confirm line passes through all path-cell centroids in order.
- Multi-unit arrangement on a single location after move completes (regression check on `arrangeLocation` after losing the `map` ref).
- Hover/click on territories and edges still resolves the right IDs after `HexGridController` loses its internal maps.
- Narrow-path edge derivation: load a map with narrow cells and confirm edges form correctly under the unified `isPathCellOpen` (parser behaviour change).
- Branchy / looping path components: confirm animation still completes without runtime error even if the path order looks visually odd.

Add unit tests for `HexCellMap`:

- `edgeBetween(a, b)` / `edgeBetween(b, a)` return the same edge.
- `edgeById(id)` matches the ID produced by `edgeBetween`.
- `edgeAtCoord(coord)` returns the edge for every cell in its `pathCoords`, `undefined` otherwise.
- `pathCoords` of a known fixture edge starts at a T_A-adjacent cell and ends at a T_B-adjacent cell.
- `territoryAtCoord(coord)` returns the territory for its coord and `undefined` for path/empty cells.

## Open questions

- **Edge centre for even-length chains.** Current code returns the midpoint between the two middle tiles. Preserved as-is in `Navigation.locationCenter`. Reconsider if movement feels off-centre after refactor.
- **Branchy component ordering.** BFS order is deterministic but may not match an intuitive "down the centre" walk for non-linear components. Acceptable given Phase 1's component-shape assumptions; revisit if multi-edge or junction support arrives.
- **Navigation Y origin.** Spec returns `y = 0`. If `HexGridController.getWorldPosition` ever returns non-zero Y (e.g. terrain elevation), Navigation passes it through unchanged and callers continue to lift by their own offset. Confirm `grid.getWorldPosition` semantics during step 6.
