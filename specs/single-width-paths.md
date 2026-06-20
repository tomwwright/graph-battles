# Single-Width Path Cells (`E <d1><d2>`)

## Overview

Extension to the markdown-table map format. Alongside the existing "wide" path cell `E -<dir>` (5 tiles, one closed side), a new "narrow" path cell `E <d1><d2>` renders only 3 tiles — center plus one arm per open direction — enabling very compact maps.

The two formats coexist: `E -1` (wide, exclude dir 1) vs `E 13` (narrow, open only in dirs 1 and 3).

---

## Geometric Foundation

The 7-tile cluster. Tile index 3 is center; surrounding tiles 0-2, 4-6 face their respective directions:

```
    [0](-1,0)  [1](-1,+1)
[2](0,-1) [3](0,0) [4](0,+1)
    [5](+1,-1) [6](+1,0)
```

Direction numbering (current):
- dir 1: (+1, 0)
- dir 2: (-1, 0)
- dir 3: (0, +1)
- dir 4: (0, -1)
- dir 5: (+1,-1)
- dir 6: (-1,+1)

`NARROW_PATH_TILE_MAPPING` maps each direction to its directly-facing tile index:
```
1→6, 2→0, 3→4, 4→2, 5→5, 6→1
```

---

## Implementation

### `TerritoryComposition.ts`

`NARROW_PATH_TILE_MAPPING` and two new static methods:

```typescript
const NARROW_PATH_TILE_MAPPING: Record<1|2|3|4|5|6, 0|1|2|3|4|5|6> = {
  1: 6, 2: 0, 3: 4, 4: 2, 5: 5, 6: 1,
};

static presentNarrowTileIndices(dirA: 1|2|3|4|5|6, dirB: 1|2|3|4|5|6): number[] {
  return [NARROW_PATH_TILE_MAPPING[dirA], 3, NARROW_PATH_TILE_MAPPING[dirB]];
}

static composeNarrowPath(dirA: 1|2|3|4|5|6, dirB: 1|2|3|4|5|6): TileType[] {
  const tiles: TileType[] = Array(7).fill('empty') as TileType[];
  for (const i of TerritoryComposition.presentNarrowTileIndices(dirA, dirB)) {
    tiles[i] = 'grass';
  }
  return tiles;
}
```

### `MapParser.ts`

**ParsedCell** — narrow variant:
```typescript
type ParsedCell =
  | { type: 'empty' }
  | { type: 'territory'; id: ID }
  | { type: 'path'; exclude: 1|2|3|4|5|6 }
  | { type: 'path-narrow'; dirA: 1|2|3|4|5|6; dirB: 1|2|3|4|5|6 };
```

**parseCell** — `E <d1><d2>` regex, normalises `dirA < dirB`, validates same-dir and adjacent-dir pairs:
```typescript
const invalidPairs: Record<1|2|3|4|5|6, (1|2|3|4|5|6)[]> = {
  1: [3, 5], 2: [4, 6], 3: [1, 6], 4: [2, 5], 5: [1, 4], 6: [2, 3],
};
```
Adjacent pairs are forbidden because they would put two territory hexes hex-adjacent to each other.

**`pathCellOpen`** — narrow cells open 4 directions (both arms + their CW-adjacent), enabling chaining:
```typescript
function pathCellOpen(cell: PathCell, dir: 1|2|3|4|5|6): boolean {
  if (cell.kind === 'wide') return cell.exclude !== dir;
  return cell.dirA === dir
    || DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING[cell.dirA] === dir
    || cell.dirB === dir
    || DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING[cell.dirB] === dir;
}

const DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING: Record<1|2|3|4|5|6, 1|2|3|4|5|6> = {
  1: 3, 2: 4, 3: 6, 4: 5, 5: 1, 6: 2,
};
```

**RenderMap.pathCells** — discriminated union:
```typescript
export type PathCell =
  | { coord: HexCoord; kind: 'wide'; exclude: 1|2|3|4|5|6 }
  | { coord: HexCoord; kind: 'narrow'; dirA: 1|2|3|4|5|6; dirB: 1|2|3|4|5|6 };
```

### `MapRenderer.ts`

Dispatch on `cell.kind` in `loadMap`:
```typescript
const tiles = cell.kind === 'wide'
  ? TerritoryComposition.composePath(cell.exclude)
  : TerritoryComposition.composeNarrowPath(cell.dirA, cell.dirB);
```

### `UnitRenderer.ts`

Dispatch on `pathCell.kind` in `hexCentroid`:
```typescript
const present = pathCell.kind === 'wide'
  ? TerritoryComposition.presentTileIndices(pathCell.exclude)
  : TerritoryComposition.presentNarrowTileIndices(pathCell.dirA, pathCell.dirB);
```

---

## Files Changed (implemented)

| File | Change |
|------|--------|
| `src/rendering/TerritoryComposition.ts` | `NARROW_PATH_TILE_MAPPING`, `composeNarrowPath`, `presentNarrowTileIndices` |
| `src/map/MapParser.ts` | `ParsedCell` + `PathCell` union, `parseCell` regex + validation, `isOpen`, `pathCellOpen`, `DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING` |
| `src/rendering/MapRenderer.ts` | Dispatch on `cell.kind` |
| `src/rendering/UnitRenderer.ts` | Dispatch on `pathCell.kind` in `hexCentroid` |
| `src/rendering/TerritoryComposition.test.ts` | Narrow path tests |
| `src/map/MapParser.test.ts` | Narrow parse + connectivity tests |

---

---

# Clockwise Tile & Direction Index Refactor

## Motivation

Currently tile indices 0-6 have no relationship to direction indices 1-6, requiring `NARROW_PATH_TILE_MAPPING` as a lookup. Renumbering both directions and tiles clockwise 1-6 around the center (center = 0) makes tile index = direction index throughout, and simplifies several tables to closed-form expressions.

## New Numbering (clockwise from North)

```
         [1] N
    [6] W     [2] NE
    [5] SW    [3] E
         [4] S
```

Tile 0 = center. Tile D = the surrounding tile facing direction D.

| New dir | Name | hex (Δx,Δz) | Old dir |
|---------|------|-------------|---------|
| 1 | N | (-1, 0) | 2 |
| 2 | NE | (-1,+1) | 6 |
| 3 | E | (0,+1) | 3 |
| 4 | S | (+1, 0) | 1 |
| 5 | SW | (+1,-1) | 5 |
| 6 | W | (0,-1) | 4 |

Old→new tile index: 0→1, 1→2, 2→6, 3(center)→0, 4→3, 5→5, 6→4

**Key properties unlocked:**
- `OPPOSITE[D] = D > 3 ? D - 3 : D + 3`
- `CLOSED_DIR_TO_DROPPED_TILES[D] = [D, D%6+1]`
- `DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING[D] = D%6+1`
- `presentNarrowTileIndices(A, B) = [0, A, B]` — no lookup needed
- Adjacent pairs = consecutive in CW circle: `(1,2),(2,3),(3,4),(4,5),(5,6),(6,1)`

## Implementation

### `src/rendering/HexCoordinates.ts`

```typescript
const AXIAL_HEX_TILE_OFFSETS: ReadonlyArray<AxialCoord> = [
  { q:  0, r:  0 }, // 0 = center
  { q: -1, r:  0 }, // 1 = dir 1 (N)
  { q: -1, r:  1 }, // 2 = dir 2 (NE)
  { q:  0, r:  1 }, // 3 = dir 3 (E)
  { q:  1, r:  0 }, // 4 = dir 4 (S)
  { q:  1, r: -1 }, // 5 = dir 5 (SW)
  { q:  0, r: -1 }, // 6 = dir 6 (W)
];

export const CENTER_OFFSET_INDEX = 0; // was 3
```

### `src/rendering/TerritoryComposition.ts`

Remove `NARROW_PATH_TILE_MAPPING`. Replace `CLOSED_DIR_TO_DROPPED_TILES` with formula pattern:
```typescript
const CLOSED_DIR_TO_DROPPED_TILES: Record<1|2|3|4|5|6, [number, number]> = {
  1: [1, 2], 2: [2, 3], 3: [3, 4],
  4: [4, 5], 5: [5, 6], 6: [6, 1],
};
```

`presentNarrowTileIndices` — no lookup needed:
```typescript
static presentNarrowTileIndices(dirA: 1|2|3|4|5|6, dirB: 1|2|3|4|5|6): number[] {
  return [0, dirA, dirB];
}
```

`compose()` — surround array indexed by direction (1-6):
```typescript
const surround = new Array(7).fill('grass') as TileType[];
if (hasFarm) { surround[2] = 'farm'; surround[5] = 'farm'; }       // NE, SW
if (hasCity) { surround[2] = 'mill'; surround[6] = 'village'; surround[4] = 'sheep'; }
if (hasFort && (hasCity || hasCastle)) { surround[1] = 'castle'; }
if (!hasFarm && !hasFort && !hasCity && !hasCastle) { surround[1] = 'forest'; surround[4] = 'forest'; }
return [center, surround[1], surround[2], surround[3], surround[4], surround[5], surround[6]];
```

Update class doc: "Index 0 is center; indices 1-6 correspond to clockwise hex directions (1=N, 2=NE, 3=E, 4=S, 5=SW, 6=W)."

### `src/map/MapParser.ts`

```typescript
const HEX_DIRS: Array<[number, number]> = [
  [-1,  0], // dir 1: N
  [-1, +1], // dir 2: NE
  [ 0, +1], // dir 3: E
  [+1,  0], // dir 4: S
  [+1, -1], // dir 5: SW
  [ 0, -1], // dir 6: W
];

const OPPOSITE: Record<1|2|3|4|5|6, 1|2|3|4|5|6> = { 1:4, 4:1, 2:5, 5:2, 3:6, 6:3 };

const DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING: Record<1|2|3|4|5|6, 1|2|3|4|5|6> = {
  1:2, 2:3, 3:4, 4:5, 5:6, 6:1,
};

const invalidPairs: Record<1|2|3|4|5|6, (1|2|3|4|5|6)[]> = {
  1: [2, 6], 2: [1, 3], 3: [2, 4],
  4: [3, 5], 5: [4, 6], 6: [5, 1],
};
```

### `src/providers/StubGameProvider.ts`

Direction mapping (old→new: 1→4, 2→1, 3→3, 4→6, 5→5, 6→2):
- `E -1` → `E -4`
- `E -6` → `E -2`

### Tests

**`TerritoryComposition.test.ts`** — update expected tile indices: center is now 0, arms are at direction indices. Example: `composeNarrowPath(1, 4)` → `tiles[0]='grass'` (center), `tiles[1]='grass'` (dir1 arm), `tiles[4]='grass'` (dir4 arm).

**`MapParser.test.ts`** — update map strings (`E -1`→`E -4`, `E -6`→`E -2`); adjacent pair test `E 13`→`E 12` (new dirs 1 and 2 are adjacent).

## Files to Change

| File | Change |
|------|--------|
| `src/rendering/HexCoordinates.ts` | Reorder `AXIAL_HEX_TILE_OFFSETS`, `CENTER_OFFSET_INDEX` 3→0 |
| `src/rendering/TerritoryComposition.ts` | `CLOSED_DIR_TO_DROPPED_TILES`, remove `NARROW_PATH_TILE_MAPPING`, `presentNarrowTileIndices`, `compose()` surround |
| `src/map/MapParser.ts` | `HEX_DIRS`, `OPPOSITE`, `DIRECTION_TO_ADDITIONAL_ADJACENT_DIRECTION_MAPPING`, `invalidPairs` |
| `src/providers/StubGameProvider.ts` | Map string direction numbers |
| `src/rendering/TerritoryComposition.test.ts` | Expected tile indices |
| `src/map/MapParser.test.ts` | Map strings and direction numbers |

## Verification

1. `npx tsc --noEmit` — no type errors
2. `yarn test` — all tests pass
3. `yarn dev` — map renders identically (pure renumbering, same geometry)
