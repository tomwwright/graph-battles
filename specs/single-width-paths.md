# Single-Width Path Cells (`E <d1><d2>`)

## Overview

Extension to the markdown-table map format. Alongside the existing "wide" path cell `E -<dir>` (5 tiles, one closed side), a new "narrow" path cell `E <d1><d2>` renders only 3 tiles — center plus one arm per open direction — enabling very compact maps.

The two formats coexist: `E -1` (wide, exclude dir 1) vs `E 13` (narrow, open only in dirs 1 and 3).

---

## Geometric Foundation: Arm Tile Mapping

The 7-tile cluster in axial coordinates:

```
    [0](-1,0)  [1](-1,+1)
[2](0,-1) [3](0,0) [4](0,+1)
    [5](+1,-1) [6](+1,0)
```

Stride vectors from `hexToTileAxial` (+1 hex.x → (+3,-1), +1 hex.z → (+1,+2)):
- Dir 1 (+1,0): stride (+3,-1)
- Dir 2 (-1,0): stride (-3,+1)
- Dir 3 (0,+1): stride (+1,+2)
- Dir 4 (0,-1): stride (-1,-2)
- Dir 5 (+1,-1): stride (+2,-3)
- Dir 6 (-1,+1): stride (-2,+3)

For `E AB`, arm tile toward dir A = `argmax_i(proj(stride_A, tile_i) - proj(stride_B, tile_i))`.

All 15 possible direction pairs reduce to **3 visual strip patterns**:

| Pattern | Present indices | Pairs |
|---------|----------------|-------|
| Diagonal (NE-SW) | `[1, 3, 5]` | All except the 5 below |
| Horizontal (E-W) | `[2, 3, 4]` | `(1,5)`, `(2,6)`, `(3,4)` |
| Vertical (N-S) | `[0, 3, 6]` | `(1,4)`, `(2,3)` |

---

## Implementation

### `TerritoryComposition.ts`

Add module-level constants and two new static methods:

```typescript
const NARROW_HORIZONTAL_PAIRS = new Set(['15', '26', '34']);
const NARROW_VERTICAL_PAIRS = new Set(['14', '23']);

static presentNarrowTileIndices(dirA: 1|2|3|4|5|6, dirB: 1|2|3|4|5|6): number[] {
  const key = `${Math.min(dirA, dirB)}${Math.max(dirA, dirB)}`;
  if (NARROW_HORIZONTAL_PAIRS.has(key)) return [2, 3, 4];
  if (NARROW_VERTICAL_PAIRS.has(key)) return [0, 3, 6];
  return [1, 3, 5];
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

**ParsedCell** — add narrow variant:
```typescript
type ParsedCell =
  | { type: 'empty' }
  | { type: 'territory'; id: ID }
  | { type: 'path'; exclude: 1|2|3|4|5|6 }
  | { type: 'path-narrow'; dirA: 1|2|3|4|5|6; dirB: 1|2|3|4|5|6 };
```

**parseCell** — add regex before existing `eMatch`:
```typescript
const nMatch = s.match(/^E\s*([1-6])([1-6])$/);
if (nMatch) {
  const dirA = parseInt(nMatch[1]) as 1|2|3|4|5|6;
  const dirB = parseInt(nMatch[2]) as 1|2|3|4|5|6;
  if (dirA === dirB) throw new Error(`MapParser: path-narrow cell at (${row},${col}) has dirA === dirB`);
  return { type: 'path-narrow', dirA, dirB };
}
```

**RenderMap.pathCells** — discriminated union:
```typescript
export type PathCell =
  | { coord: HexCoord; kind: 'wide'; exclude: 1|2|3|4|5|6 }
  | { coord: HexCoord; kind: 'narrow'; dirA: 1|2|3|4|5|6; dirB: 1|2|3|4|5|6 };

export type RenderMap = {
  territories: { id: ID; coord: HexCoord }[];
  pathCells: PathCell[];
  edges: { territoryA: ID; territoryB: ID; pathCoords: HexCoord[] }[];
};
```

**isOpen** — add narrow case:
```typescript
if (cell.type === 'path-narrow') return cell.dirA === dir || cell.dirB === dir;
```

**parseMap cell collection**:
```typescript
if (cell.type === 'path') {
  pathCells.push({ coord, kind: 'wide', exclude: cell.exclude });
} else if (cell.type === 'path-narrow') {
  pathCells.push({ coord, kind: 'narrow', dirA: cell.dirA, dirB: cell.dirB });
}
```

**Dangling open warning** — narrow cells only check their 2 open dirs:
```typescript
const openDirs = cell.kind === 'wide'
  ? ([1,2,3,4,5,6] as const).filter(d => d !== cell.exclude)
  : [cell.dirA, cell.dirB];
```

### `MapRenderer.ts`

Dispatch on `cell.kind` in the path cell loop inside `loadMap`:
```typescript
const tiles = cell.kind === 'wide'
  ? TerritoryComposition.composePath(cell.exclude)
  : TerritoryComposition.composeNarrowPath(cell.dirA, cell.dirB);
```

### `UnitRenderer.ts`

Dispatch on `pathCell.kind` in `hexCentroid`:
```typescript
const pathCell = this.map?.pathCells.find((p) => coordKey(p.coord) === key);
if (!pathCell) { /* territory: use hexCenterTile */ }

const present = pathCell.kind === 'wide'
  ? TerritoryComposition.presentTileIndices(pathCell.exclude)
  : TerritoryComposition.presentNarrowTileIndices(pathCell.dirA, pathCell.dirB);
```

---

## Files Changed

| File | Change |
|------|--------|
| `packages/gamev2/src/rendering/TerritoryComposition.ts` | `composeNarrowPath`, `presentNarrowTileIndices`, 2 set constants |
| `packages/gamev2/src/map/MapParser.ts` | `ParsedCell` + `PathCell` union, `parseCell` regex, `isOpen`, dangling warning, cell collection |
| `packages/gamev2/src/rendering/MapRenderer.ts` | Dispatch on `cell.kind` |
| `packages/gamev2/src/rendering/UnitRenderer.ts` | Dispatch on `pathCell.kind` in `hexCentroid` |
| `packages/gamev2/src/rendering/TerritoryComposition.test.ts` | New narrow path tests |
| `packages/gamev2/src/map/MapParser.test.ts` | Narrow parse + connectivity tests |

---

## Verification

1. `npx tsc --noEmit` — no type errors
2. `yarn test` — all tests pass
3. Add a narrow path cell to `STUB_MAP_TEXT` in `StubGameProvider.ts` and `yarn dev` to visually confirm 3-tile cluster renders correctly
