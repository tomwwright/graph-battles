import { describe, it, expect } from 'vitest';
import { TerritoryComposition } from './TerritoryComposition';

// NARROW_PATH_TILE_MAPPING: each direction → its directly-facing tile index
// 1→6, 2→0, 3→4, 4→2, 5→5, 6→1

describe('TerritoryComposition.composeNarrowPath', () => {
  it('uses tile directly facing each open direction', () => {
    // (1,2): dir1→tile6, dir2→tile0, center→tile3
    const tiles = TerritoryComposition.composeNarrowPath(1, 2);
    expect(tiles[0]).toBe('grass'); // dir 2 arm
    expect(tiles[3]).toBe('grass'); // center
    expect(tiles[6]).toBe('grass'); // dir 1 arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
    expect(tiles.filter((t) => t === 'empty')).toHaveLength(4);
  });

  it('(3,5): dir3→tile4, dir5→tile5, center→tile3', () => {
    const tiles = TerritoryComposition.composeNarrowPath(3, 5);
    expect(tiles[3]).toBe('grass'); // center
    expect(tiles[4]).toBe('grass'); // dir 3 arm
    expect(tiles[5]).toBe('grass'); // dir 5 arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
  });

  it('(1,4): dir1→tile6, dir4→tile2, center→tile3', () => {
    const tiles = TerritoryComposition.composeNarrowPath(1, 4);
    expect(tiles[2]).toBe('grass'); // dir 4 arm
    expect(tiles[3]).toBe('grass'); // center
    expect(tiles[6]).toBe('grass'); // dir 1 arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
  });

  it('returns same result regardless of arg order', () => {
    expect(TerritoryComposition.composeNarrowPath(1, 2)).toEqual(TerritoryComposition.composeNarrowPath(2, 1));
    expect(TerritoryComposition.composeNarrowPath(3, 5)).toEqual(TerritoryComposition.composeNarrowPath(5, 3));
    expect(TerritoryComposition.composeNarrowPath(1, 4)).toEqual(TerritoryComposition.composeNarrowPath(4, 1));
  });
});

describe('TerritoryComposition.presentNarrowTileIndices', () => {
  it('returns [armA, center, armB] for each direction pair', () => {
    expect(TerritoryComposition.presentNarrowTileIndices(1, 2)).toContain(6); // dir1 arm
    expect(TerritoryComposition.presentNarrowTileIndices(1, 2)).toContain(3); // center
    expect(TerritoryComposition.presentNarrowTileIndices(1, 2)).toContain(0); // dir2 arm
    expect(TerritoryComposition.presentNarrowTileIndices(1, 2)).toHaveLength(3);
  });

  it('always includes center tile 3', () => {
    expect(TerritoryComposition.presentNarrowTileIndices(3, 5)).toContain(3);
    expect(TerritoryComposition.presentNarrowTileIndices(1, 4)).toContain(3);
    expect(TerritoryComposition.presentNarrowTileIndices(2, 5)).toContain(3);
  });
});
