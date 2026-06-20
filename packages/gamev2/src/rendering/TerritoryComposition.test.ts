import { describe, it, expect } from 'vitest';
import { TerritoryComposition } from './TerritoryComposition';
import { toNarrowPathCellIndices } from '../map/HexCoordinates';

// New tile numbering: 0=center, 1-6 = clockwise directions (1=N,2=NE,3=E,4=S,5=SW,6=W)
// presentNarrowTileIndices(A, B) = [0, A, B]

describe('TerritoryComposition.composeNarrowPath', () => {
  it('(1,4): N↔S — center(0), tile1, tile4', () => {
    const tiles = TerritoryComposition.composeNarrowPath(1, 4);
    expect(tiles[0]).toBe('grass'); // center
    expect(tiles[1]).toBe('grass'); // dir 1 (N) arm
    expect(tiles[4]).toBe('grass'); // dir 4 (S) arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
    expect(tiles.filter((t) => t === 'empty')).toHaveLength(4);
  });

  it('(3,6): E↔W — center(0), tile3, tile6', () => {
    const tiles = TerritoryComposition.composeNarrowPath(3, 6);
    expect(tiles[0]).toBe('grass'); // center
    expect(tiles[3]).toBe('grass'); // dir 3 (E) arm
    expect(tiles[6]).toBe('grass'); // dir 6 (W) arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
  });

  it('(2,5): NE↔SW — center(0), tile2, tile5', () => {
    const tiles = TerritoryComposition.composeNarrowPath(2, 5);
    expect(tiles[0]).toBe('grass'); // center
    expect(tiles[2]).toBe('grass'); // dir 2 (NE) arm
    expect(tiles[5]).toBe('grass'); // dir 5 (SW) arm
    expect(tiles.filter((t) => t === 'grass')).toHaveLength(3);
  });

  it('returns same result regardless of arg order', () => {
    expect(TerritoryComposition.composeNarrowPath(1, 4)).toEqual(TerritoryComposition.composeNarrowPath(4, 1));
    expect(TerritoryComposition.composeNarrowPath(3, 6)).toEqual(TerritoryComposition.composeNarrowPath(6, 3));
    expect(TerritoryComposition.composeNarrowPath(2, 5)).toEqual(TerritoryComposition.composeNarrowPath(5, 2));
  });
});

describe('presentNarrowTileIndices', () => {
  it('returns [0, dirA, dirB] — center plus two arm indices', () => {
    expect(toNarrowPathCellIndices(1, 4)).toEqual([0, 1, 4]);
    expect(toNarrowPathCellIndices(3, 6)).toEqual([0, 3, 6]);
    expect(toNarrowPathCellIndices(2, 5)).toEqual([0, 2, 5]);
  });

  it('always includes center tile 0', () => {
    expect(toNarrowPathCellIndices(1, 4)).toContain(0);
    expect(toNarrowPathCellIndices(3, 6)).toContain(0);
    expect(toNarrowPathCellIndices(2, 5)).toContain(0);
  });

  it('has length 3', () => {
    expect(toNarrowPathCellIndices(1, 4)).toHaveLength(3);
    expect(toNarrowPathCellIndices(3, 6)).toHaveLength(3);
  });
});
