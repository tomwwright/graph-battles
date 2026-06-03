# Better Paths

## Goal

Replace the current "grass = adjacent to everything" path-cell model with a richer composition system where each path cell explicitly declares one closed hex-direction. This allows for technically adjacent cells to be marked as non-adjacent to be used in separate paths.

Path cells render as wide 5-tile clusters (center + 4 outer, with 2 outer tiles dropped on the closed side) instead of full 7-tile blobs. Adjacency is derived from declared openings on both sides of a grid boundary, removing the need for empty spacer cells between independent paths.

Map authoring moves from positional ASCII grids to a markdown table format with explicit IDs and per-cell closure annotations, so maps stay readable and edit-stable.

## Scope

In scope:

- New map text format: markdown table, cells `T <id>`, `E -<exclude>`, blank.
- Parser producing `RenderMap` with `pathCells: { coord, exclude }[]`.
- Direction numbering aligned with `MapParser.hexNeighbours` (1-6).
- Composition system: one variant, six rotations driven by `exclude`.
- Side → outer tile slot mapping table for the renderer.
- Edge derivation by flood-fill over reciprocal-open links between path cells and territories.
- `TerritoryComposition.composePath(exclude)` returning a 7-element `TileType[]` with two `'empty'` entries.
- Validation pass: dangling opens, isolated path cells, direct T-T adjacency, ID uniqueness.

Out of scope:

- Junction variants (path cells with more than one closed direction or branched shapes).
- Adjacent-pair open directions ("bend" / sharp hairpin variant) — disallowed.
- Multiple edges between the same territory pair via distinct path components — should fail validation.
- Migration of v1 game client. v1 uses its own map format; unaffected.

## Model

### Path cell

A path cell is a single hex unit composing a path between two territories. Properties:

- `coord: HexCoord` — position in hex space (row idx → `x`, col idx → `z`).
- `exclude: 1 | 2 | 3 | 4 | 5 | 6` — single hex-direction this cell does not bridge across.

A path cell is open in five hex-directions (all except `exclude`).

### Territory cell

A territory cell opens all six hex-directions. Territories are never directly hex-adjacent to other territories — parser errors on T-T adjacency.

### Adjacency

Two grid-adjacent cells A and B are adjacent if:

- A's side facing B is open, and
- B's side facing A is open.

For a path cell, "open" means the direction is not `exclude`. For a territory, all directions are open.

### Edge

A gameplay `Edge` (per `@battles/models`) connects two territories. Derived: flood-fill over the path-cell adjacency graph (reciprocal-open links). Each connected component records the set of bordering territories. Every pair of bordering territories in a component produces one edge. Edge pairs are deduped across components — multiple components touching the same `(T_a, T_b)` pair merge their path-cell coords into one edge.

## Direction numbering

Direction indices 1-6 map to the `hexNeighbours` order in `packages/gamev2/src/map/MapParser.ts`:

| dir | Δhex (x, z) | Note |
|---|---|---|
| 1 | (+1, 0) | +x |
| 2 | (-1, 0) | -x |
| 3 | (0, +1) | +z |
| 4 | (0, -1) | -z |
| 5 | (+1, -1) | +x,-z |
| 6 | (-1, +1) | -x,+z |

Opposites are axis-paired: 1↔2, 3↔4, 5↔6.

Note: the numbering is not clockwise. It mirrors the existing implementation. Map authors need to memorise the table or refer to a comment block in the parser source.

## Mapping tiles to drop based on `exclude`

Each closed hex-direction removes two outer tile slots from the 7-tile composition. The mapping is derived from axial geometry of the super-hex tile layout (see `HexCoordinates.AXIAL_HEX_TILE_OFFSETS`, center index 3):

| Exclude | Drop tile indices | Outer axial offsets dropped |
|---|---|---|
| 1 | 5, 6 | (1,-1), (1,0) |
| 2 | 0, 1 | (-1,0), (-1,1) |
| 3 | 4, 6 | (0,1), (1,0) |
| 4 | 0, 2 | (-1,0), (0,-1) |
| 5 | 2, 5 | (0,-1), (1,-1) |
| 6 | 1, 4 | (-1,1), (0,1) |

Sanity properties:

- Opposite-direction pairs (1↔2, 3↔4, 5↔6) have disjoint drop sets.
- Union over all six closed-direction drop sets covers all six outer tile slots, each appearing exactly twice. Each outer tile sits at the boundary between two adjacent hex-directions.

Inverse lookup (slot → which two dirs it faces), useful for validation/debug:

| Slot (tile idx) | Faces dirs |
|---|---|
| 0 | 2, 4 |
| 1 | 2, 6 |
| 2 | 4, 5 |
| 4 | 3, 6 |
| 5 | 1, 3 |
| 6 | 1, 5 |

## Map text format

Markdown table. Row index → `hex.x`, column index (after splitting on `|`) → `hex.z`. Cells are trimmed.

### Cell tokens

| Token | Meaning |
|---|---|
| `T <id>` | Territory with positive integer ID; resolves to `#T<id>` |
| `E -<dir>` | Path cell with closed direction `dir ∈ {1..6}` |
| blank | Empty cell |

The leading `-` in `E -<dir>` is semantic: this is the direction being **excluded** from the cell's openings.

### Example

```markdown
| T 1  | E -3 | E -6 | T 2 |
| E -1 | T 3  |      |     |
```

### Markdown header

Markdown tables conventionally require a header separator row (`|---|---|`). The parser tolerates one and treats it as decorative — any row matching `^\|[-:\s|]+\|$` is skipped during parsing. Authors may omit it.

### Grammar

```
cell      := empty | territory | path
empty     := WS*
territory := WS* 'T' WS* digit+ WS*
path      := WS* 'E' WS* '-' [1-6] WS*
```

Any cell not matching these is a parse error reporting its `(row, col)` and raw content.

## Parser

Location: `packages/gamev2/src/map/MapParser.ts`. The existing `parseMap` function is deprecated — retain the function to be removed at later point.

### Pipeline

1. **Tokenise rows.** Split input on `\n`, trim, keep lines starting with `|`, drop markdown separator rows.
2. **Tokenise cells.** Strip leading/trailing `|`, split on `|`, run cell grammar per cell.
3. **Build grid.** 2D array of `ParsedCell` keyed by `(row, col)`.
4. **Collect entities.** Walk grid; emit `territories: { id, coord }[]` and `pathCells: { coord, exclude }[]`.
5. **Derive bridges.** For each path cell, for each direction except its closed one, look up the grid neighbour. Open iff neighbour exists and its open-direction toward this cell is also open (territory always, or path cell whose exclude ≠ opposite-of-our-dir).
6. **Flood-fill components.** Connected components over the path-cell graph (reciprocal-open links). For each component, collect the set of territories that bridge into any cell of the component.
7. **Emit edges.** For each ordered pair of bordering territories `(T_a, T_b)` with `a < b` per component, emit `{ territoryA, territoryB, pathCoords }`. Dedupe by pair across components; merge `pathCoords` on collision.
8. **Validate.** See Validation.

### Types

```ts
type ParsedCell =
  | { type: 'empty' }
  | { type: 'territory'; id: ID }
  | { type: 'path'; exclude: 1 | 2 | 3 | 4 | 5 | 6 };

type RenderMap = {
  territories: { id: ID; coord: HexCoord }[];
  pathCells: { coord: HexCoord; exclude: 1 | 2 | 3 | 4 | 5 | 6 }[];
  edges: { territoryA: ID; territoryB: ID; pathCoords: HexCoord[] }[];
};
```

### Adjacency helpers

```ts
const HEX_DIRS: Array<[number, number]> = [
  [+1, 0],  // dir 1
  [-1, 0],  // dir 2
  [0, +1],  // dir 3
  [0, -1],  // dir 4
  [+1, -1], // dir 5
  [-1, +1], // dir 6
];

const OPPOSITE = { 1: 2, 2: 1, 3: 4, 4: 3, 5: 6, 6: 5 } as const;

function isOpen(cell: ParsedCell, dir: 1|2|3|4|5|6): boolean {
  if (cell.type === 'territory') return true;
  if (cell.type === 'path') return cell.exclude !== dir;
  return false;
}
```

## Composition

Location: `packages/gamev2/src/rendering/TerritoryComposition.ts`.

```ts
const CLOSED_DIR_TO_DROPPED_TILES: Record<1|2|3|4|5|6, [number, number]> = {
  1: [5, 6],
  2: [0, 1],
  3: [4, 6],
  4: [0, 2],
  5: [2, 5],
  6: [1, 4],
};

static composePath(exclude: 1|2|3|4|5|6): TileType[] {
  const tiles: TileType[] = ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
  const [a, b] = CLOSED_DIR_TO_DROPPED_TILES[exclude];
  tiles[a] = 'empty';
  tiles[b] = 'empty';
  return tiles;
}
```

The existing `composGrass()` is removed (no longer used — path cells always have a closed direction).

`'empty'` is already a `TileType` member. `AssetLoader.TILE_TYPE_FILES` has no entry for it, so `AssetLoader.clone('empty', ...)` returns null. `MapRenderer.placeSingleTile` already bails on null mesh — the empty slots simply place nothing. No new branches needed.

## Renderer changes

Location: `packages/gamev2/src/rendering/MapRenderer.ts`.

`loadMap` signature changes:

```ts
loadMap(
  territories: { id: ID; coord: HexCoord }[],
  pathCells: { coord: HexCoord; exclude: 1|2|3|4|5|6 }[],
  gameMap: GameMap
): AbstractMesh[]
```

Per path cell: `TerritoryComposition.composePath(cell.exclude)` instead of `composGrass()`. Otherwise placement loop unchanged.

`HexGridController.setTerritoryMap` keeps its current interface; the `edges` argument's `grassCoords` is renamed to `pathCoords` to match `RenderMap`. Behaviour unchanged — coords still index hover/click lookups for the edge.

## Validation

`packages/gamev2/src/map/validateRenderMap.ts` extends with:

- **Direct T-T adjacency**: any pair of territory cells in grid-neighbour positions → error.
- **Duplicate territory IDs**: → error.
- **Dangling open**: a path cell's open direction pointing at a missing/empty cell, or at a path cell whose facing direction is also closed (no reciprocal) → warn.
- **Isolated path cell**: a path cell with zero derived bridges (every open dir is dangling) → warn.
- **Closed direction at boundary**: closed direction pointing off-grid → allowed (treated as a wall).

Warnings should not fail parse; surface via existing validation infrastructure for author feedback.

## Consumers

### `GameSessionProvider`

Already calls `parseMap(mapText)` and feeds the result into `GameOrchestrator.initialise(renderMap)`. The result shape changes (`grassCells` → `pathCells`), but the consumer just forwards it. Update the type import.

### `GameOrchestrator.initialise`

Calls `renderer.initialise(renderMap, map)` which fans out to `MapRenderer.loadMap` with the relevant fields. Update the field destructure to `pathCells`.

### `validateRenderMap`

Continues to compare `RenderMap.territories` IDs against `gameMap.territoryIds` — unchanged. Extend with path-cell checks above.

### Stub map

`STUB_MAP_TEXT` in `packages/gamev2/src/providers/StubGameProvider.ts` migrates to the markdown-table format. Smallest representative example:

```markdown
| T1     | E -3   | T2     |
| E -1   |        | E -1   |
| T3     | E -3   | T4     |
```

(Concrete fixture to be designed alongside the implementation; exact layout subject to the game data the stub provider serves.)

## Implementation steps

1. Add `composePath` + drop-table to `TerritoryComposition`. Keep `composGrass` temporarily as a shim if needed during migration.
2. Update `RenderMap` type in `MapParser.ts`. Rename `grassCells` → `pathCells`, `grassCoords` → `pathCoords`.
3. Replace `parseMap` with markdown-table parser. Drop legacy ASCII-grid code path.
4. Wire flood-fill edge derivation against the new adjacency rule.
5. Update `MapRenderer.loadMap` to consume `pathCells` and call `composePath(exclude)`.
6. Update `HexGridController.setTerritoryMap` field name from `grassCoords` to `pathCoords`.
7. Update `validateRenderMap` with new validation checks.
8. Migrate `STUB_MAP_TEXT` and any committed `.txt` map fixtures to the markdown format.
9. Update `GameSessionProvider` / `GameOrchestrator` for renamed fields.
10. Remove `composGrass` once no consumers remain.
11. Manual verification via `yarn workspace @battles/gamev2 dev` — stub, local, and API providers.

## Testing

gamev2 has no test suite. Verification is manual:

- Launch dev server, load the stub map, confirm path cells render as 5-tile clusters with the correct outer slots dropped per closed direction.
- Hover edges; confirm `HexGridController` hover lookup still resolves edge identity (now via `pathCoords`).
- Click territories on either end of a path; confirm derived edge produces correct movement targets.
- Edge cases: path cell whose closed side faces another path cell (both close the boundary — confirm no bridge), path cell whose closed side faces a territory (the territory still opens its side, so no bridge — confirm).
- Validation: feed a map with T-T adjacency and confirm parse error; feed dangling-open map and confirm warning.

## Open questions

- **Junction support.** A future variant may allow path cells with 2+ closed directions or a 3-way branch. Out of scope for this spec; the closed-dir-as-single-number assumption is load-bearing for the current composition table. Adding junctions requires extending both the parse grammar (e.g. `E -1,3`) and the composition table.
- **Multi-edge between same pair.** If two distinct path components both connect `T_a` and `T_b`, the model collapses them into one `Edge`. Authors who want gameplay-distinct routes are blocked until the model supports multi-edge or until path components stay separate visually but merge logically.
- **Direction numbering convention.** Inherited from `hexNeighbours` (not clockwise). If authors find this confusing, a future revision can renumber and provide a migration script.
