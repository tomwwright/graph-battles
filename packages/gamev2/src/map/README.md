# `src/map` — Hex map model and parsing

This directory owns the **non-rendering** side of the game map: hex coordinate math, the typed map model (`HexCellMap`), the text-format parsers, and validation against the gameplay `GameMapData` from `@battles/models`.

Renderers (`src/rendering/*`) consume `HexCellMap` and the helpers exported here. Nothing in this directory imports from `src/rendering`.

## Files

| File | Role |
|------|------|
| `HexCoordinates.ts` | Pure geometry — coord types, hex↔tile transforms, direction tables, tile-presence helpers. |
| `HexCellMap.ts` | `HexCell` discriminated union, `HexCellMap` class, `constructHexCellMap` builder. |
| `MapParser.ts` | Text → `HexCell[]` lifters. `parseMap` (markdown table) + `parseMapLegacy` (ASCII grid). Each delegates to `constructHexCellMap`. |
| `validateHexCellMap.ts` | Cross-check `HexCellMap` against `GameMapData` (territory + edge ID drift detector). |
| `HexCellMap.test.ts`, `MapParser.test.ts` | Vitest coverage. |

## Coordinate system

The world is two grids stacked:

- **Hex grid** — gameplay-level. Each "hex" is one territory or path cell. `HexCoord = { x, z }` in axial space.
- **Tile grid** — render-level. Each hex is a cluster of **7 tiles** (1 center + 6 outer). `OffsetCoord = { x, z }` in odd-q offset coords.

`HexCoordinates.ts` is the bridge: `hexCenterTile`, `hexToTileCoords`, `tileToHex`. Renderers use `getWorldPosition(tile)` to turn an `OffsetCoord` into a Babylon `Vector3`.

### Hex directions

Directions are numbered 1–6 **clockwise from north**:

```
    [1] N
[6] W   [2] NE
    [0] (center)
[5] SW  [3] E
    [4] S
```

The same numbering doubles as the **outer-tile slot index** (`tile[D]` sits in direction `D` from the hex centre). Both `toOffsetCoordinates(dir)` (hex-step vector) and `CLOSED_DIR_DROPPED_TILES[dir]` (tile slots along the `dir` boundary) key off this. `HEX_OPPOSITE` and `HEX_DIR_CCW_PREV` are the standard reflections.

`HEX_DIR_CCW_PREV` matters because each outer tile sits at the boundary between **two** hex directions: tile `D` is shared by direction `D` and direction `CCW_PREV[D]`.

## Cell model — `HexCell`

A `HexCell` is a discriminated union keyed on `kind`:

| Kind | Shape | Meaning |
|------|-------|---------|
| `territory` | `{ id, coord }` | Gameplay territory. All 6 outer tiles present. Opens in every direction. |
| `wide` | `{ exclude, coord }` | Path segment with one closed direction; 5 outer tiles present (drops tile `exclude` and tile `CW_NEXT[exclude]`). |
| `narrow` | `{ dirA, dirB, coord }` | Path segment with two arm tiles + centre; 3 tiles present (tiles `dirA`, `dirB`, and `0`). `dirA < dirB`, and they must not be adjacent directions. |
| `full` | `{ coord }` | Legacy ASCII grass cell. All 6 outer tiles present, every direction open. |
| `empty` | `{ coord }` | Hole in the grid. Treated as a wall. |

`PathCell = wide | narrow | full`. Empty and territory are excluded.

`TerritoryCell.id` follows the convention `#T<n>` (positive integer suffix).

### Tile-presence rules

- **wide**: drops `[exclude, CW_NEXT[exclude]]`. Present tiles = all others (including centre).
- **narrow**: present = `[0, dirA, dirB]`. Everything else dropped.
- **full**: all 7 present.

`toPathCellIndices` and `toNarrowPathCellIndices` in `HexCoordinates.ts` return the present-slot list used by both the renderer (tile placement) and `HexCellMap` (connectivity).

## Connectivity

Two predicates and one fact:

### `isPathCellOpen(cell, dir)` — loose

Returns `true` if **at least one** of the two outer tiles along the `dir` boundary is present in `cell`. Sufficient for **path-to-territory** bridges, because territories have all six outer tiles, so any present tile on the path side mates with a present tile on the territory side.

| Kind | Open in `dir` iff |
|------|------|
| `full` | always |
| `wide` | `exclude !== dir` |
| `narrow` | `dir ∈ { dirA, dirB, CCW_PREV[dirA], CCW_PREV[dirB] }` |

The CCW-prev terms in the narrow case are why narrow cells can appear open in directions they don't *cleanly* connect through — see below.

### `arePathCellsConnected(a, dirAtoB, b)` — strict (path-to-path)

Two path cells stacked across the `dirAtoB` boundary share **two tile-pair contact points**:

```
a.tile[dirAtoB]          ↔ b.tile[CW_NEXT[dirBtoA]]
a.tile[CW_NEXT[dirAtoB]] ↔ b.tile[dirBtoA]
```

At least one of the two pairs must have **both** tiles present for the cells to be genuinely connected. This catches the narrow/narrow asymmetry: e.g. `E15` (narrow `{1,5}`) and `E26` (narrow `{2,6}`) stacked N/S both appear "open" toward each other under `isPathCellOpen`, but neither tile-pair has both tiles present, so they are not really connected.

The current implementation in `HexCellMap.ts` is `areNarrowPathsAdjacent` — applied as an extra check only when both cells are narrow, since wide/full cells always have both contact tiles present at any open boundary.

### Bridge counting

Every path cell must have **exactly 2 valid bridges** at construction time, or the build throws. A bridge is:

- An open direction whose neighbour is a **territory** (path-to-territory), OR
- An open direction whose neighbour is a **path cell** open on the opposite side AND genuinely connected (path-to-path).

Off-grid (missing) and `empty` neighbours don't count — they're walls. Same with closed-back path neighbours and the narrow/narrow false-adjacency case. Bridge count `≠ 2` throws with the coord and count in the message.

## `HexCellMap` class

Immutable indexed query surface over the parsed map. Construct via `constructHexCellMap(cells)` — never call `new HexCellMap(...)` directly from outside this module.

Public API:

```ts
cellAt(coord)            // HexCell | undefined
territories()            // readonly TerritoryCell[]
pathCells()              // readonly PathCell[]
edges()                  // readonly HexEdge[]
territoryCoord(id)       // HexCoord | undefined
territoryAtCoord(coord)  // TerritoryCell | undefined
edgeById(id)             // HexEdge | undefined
edgeBetween(a, b)        // HexEdge | undefined (territory pair, order-insensitive)
edgeAtCoord(coord)       // HexEdge | undefined (which edge a path cell belongs to)
```

All accessors are `O(1)` — backed by `Map` indexes built once at construction. Renderers and the grid controller now query `HexCellMap` directly instead of maintaining parallel lookup tables.

### `HexEdge`

```ts
type HexEdge = {
  id: ID;                // "#T<a>#T<b>" with numerically smaller territory first
  territoryA: ID;        // canonical T_A (smaller number)
  territoryB: ID;        // canonical T_B
  pathCoords: HexCoord[]; // ordered T_A side → T_B side via BFS
};
```

Edge IDs follow the lobby JSON convention (`edgeIdFor(a, b)`). `pathCoords` order is established at construction time by BFS seeded from the path cells adjacent to `territoryA`, walking the path-adjacency graph. Order is **deterministic but visually approximate** for branchy/looping components — those are out of scope per the path-cell spec, so the BFS approximation is good enough.

## `constructHexCellMap(cells)` — the builder

```
cells: HexCell[]
   │
   ├─ Bucket into grid + territories + pathCells
   ├─ Validate: unique territory IDs
   ├─ Validate: no direct T-T adjacency (any hex-direction)
   ├─ Build path-cell adjacency map (reciprocal open + tile-pair check)
   ├─ Validate: every path cell has exactly 2 bridges
   ├─ Flood-fill connected path-cell components
   │       ↓ tracks per-component { cells, border-territories, cells-bordering-each-territory }
   ├─ Per component × per (T_A, T_B) border pair:
   │       order pathCoords by BFS from T_A-adjacent cells
   │       merge if (T_A, T_B) already has an edge from another component
   └─ new HexCellMap(grid, territories, pathCells, edges)
```

Validation throws on the first error encountered; partial maps are never returned.

## Parsers

Both parsers are **thin** — they lift text into `HexCell[]` and call `constructHexCellMap`. All validation, adjacency, and edge derivation lives in the builder, so adding a new format means writing a new lifter, nothing else.

### `parseMap(text): HexCellMap` — markdown table (current format)

Row index → `hex.x`, column index → `hex.z`. Cell tokens:

| Token | Cell |
|-------|------|
| `T <n>` | territory with ID `#T<n>` |
| `E -<d>` | wide path cell with `exclude = d` (closes direction `d`) |
| `E <dA><dB>` | narrow path cell with the two open directions |
| blank | empty |

Narrow tokens normalise `dirA < dirB`. Same direction (`E 11`) throws. Adjacent direction pairs (e.g. `E 12`) throw — narrows must point in non-adjacent directions, otherwise the two arm tiles would overlap.

Markdown header/separator rows matching `^\|[-:\s|]+\|$` are skipped.

Example:

```markdown
| T 1 | E -1 | T 2 |
```

### `parseMapLegacy(text): HexCellMap` — ASCII grid (deprecated)

Single-character cells. `T` → auto-numbered territory (`#T1`, `#T2`, …), `g` → `full` path cell (grass), anything else → `empty`. Same `HexCellMap` output type. Kept for fixtures and any v1-era maps that haven't been migrated.

## `validateHexCellMap(map, mapData)`

Stand-alone consistency check. Reads `mapData.dataMap` (from `@battles/models.GameMapData`), pulls out the territory and edge ID sets, and compares them against the IDs computed by `HexCellMap`. Throws if either side has IDs the other doesn't.

This catches drift between hand-authored map text and the gameplay JSON. It does **not** mutate or repair — drift is a build-time authoring error.

Kept as a free function (not a method on `HexCellMap`) so the map module stays free of any `@battles/models` import; `HexCellMap` is pure hex geometry.

## What this directory **doesn't** do

- No Babylon types, no Vector3, no Scene refs. World-space projection lives in `src/rendering/Navigation.ts`.
- No mesh placement. Tile composition (which `TileType` lands in each slot) lives in `src/rendering/TerritoryComposition.ts`.
- No game state. `HexCellMap` is a static description of the board. Turn flow, units, players, resolution all live in `@battles/models` + `src/orchestration`.

## Common tasks

**Adding a new path cell kind.** Add the variant to the `PathCell` union, extend `isPathCellOpen` and `hasOuterTile`/`areNarrowPathsAdjacent` (only if the new kind has tile-presence asymmetry), update `constructHexCellMap`'s bucket loop, and teach `Navigation.cellCenter` + `MapRenderer.loadMap` how to project/render it.

**Adding a new text format.** Write a lifter that emits `HexCell[]` and calls `constructHexCellMap`. Do not duplicate adjacency or edge-derivation logic. See `parseMapLegacy` for the minimum shape.

**Adding a connectivity rule** (e.g. cost-weighted edges, blocked dirs). Extend the bridge-count loop in `constructHexCellMap`. Add a unit test in `HexCellMap.test.ts` that exercises the rule via `constructHexCellMap(cells)` directly — these tests are format-independent and run fast.
