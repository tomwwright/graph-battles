import { describe, it, expect } from 'vitest';
import { HexCell, constructHexCellMap } from './HexCellMap';

const T = (x: number, z: number, n: number): HexCell => ({
  kind: 'territory', coord: { x, z }, id: `#T${n}`,
});
const wide = (x: number, z: number): HexCell =>
  ({ kind: 'wide', coord: { x, z }, exclude: 1 });
const empty = (x: number, z: number): HexCell => ({ kind: 'empty', coord: { x, z } });

describe('constructHexCellMap', () => {
  it('derives a single edge between two territories joined by one path cell', () => {
    // T1 — path — T2 along +z (dir 3)
    const map = constructHexCellMap([T(0, 0, 1), wide(0, 1), T(0, 2, 2)]);

    expect(map.territories()).toHaveLength(2);
    expect(map.pathCells()).toHaveLength(1);
    expect(map.edges()).toHaveLength(1);

    const edge = map.edges()[0];
    expect(edge.id).toBe('#T1#T2');
    expect(edge.territoryA).toBe('#T1');
    expect(edge.territoryB).toBe('#T2');
    expect(edge.pathCoords).toEqual([{ x: 0, z: 1 }]);
  });

  it('orders multi-cell pathCoords from T_A side to T_B side', () => {
    // T1 — p — p — p — T2
    const map = constructHexCellMap([
      T(0, 0, 1),
      wide(0, 1),
      wide(0, 2),
      wide(0, 3),
      T(0, 4, 2),
    ]);

    const edge = map.edgeBetween('#T1', '#T2')!;
    expect(edge.pathCoords).toEqual([
      { x: 0, z: 1 },
      { x: 0, z: 2 },
      { x: 0, z: 3 },
    ]);
  });

  it('throws on duplicate territory IDs', () => {
    const cells: HexCell[] = [T(0, 0, 1), wide(0, 1), T(0, 2, 1)];
    expect(() => constructHexCellMap(cells)).toThrow('duplicate territory ID #T1');
  });

  it('throws on direct territory-to-territory adjacency', () => {
    expect(() => constructHexCellMap([T(0, 0, 1), T(0, 1, 2)]))
      .toThrow('directly adjacent');
  });

  it('exposes edge by id, by territory pair, and by path-cell coord', () => {
    const map = constructHexCellMap([T(0, 0, 1), wide(0, 1), T(0, 2, 2)]);

    const byId = map.edgeById('#T1#T2');
    expect(byId).toBeDefined();
    expect(map.edgeBetween('#T1', '#T2')).toBe(byId);
    expect(map.edgeBetween('#T2', '#T1')).toBe(byId);
    expect(map.edgeAtCoord({ x: 0, z: 1 })).toBe(byId);
    expect(map.edgeAtCoord({ x: 0, z: 0 })).toBeUndefined();
  });

  it('resolves territory by id and by coord', () => {
    const map = constructHexCellMap([T(0, 0, 1), wide(0, 1), T(0, 2, 2)]);

    expect(map.territoryCoord('#T1')).toEqual({ x: 0, z: 0 });
    expect(map.territoryAtCoord({ x: 0, z: 2 })?.id).toBe('#T2');
    expect(map.territoryAtCoord({ x: 0, z: 1 })).toBeUndefined();
  });

  it('derives an edge through a narrow path cell', () => {
    // Narrow dirA=3, dirB=6 → opens to +z (T2) and -z (T1)
    const narrow: HexCell = {
      kind: 'narrow', coord: { x: 0, z: 1 }, dirA: 3, dirB: 6,
    };
    const map = constructHexCellMap([T(0, 0, 1), narrow, T(0, 2, 2)]);

    expect(map.edges()).toHaveLength(1);
    expect(map.edgeBetween('#T1', '#T2')).toBeDefined();
  });

  it('derives an edge through a full path cell (legacy grass)', () => {
    const full: HexCell = { kind: 'full', coord: { x: 0, z: 1 } };
    const map = constructHexCellMap([T(0, 0, 1), full, T(0, 2, 2)]);

    expect(map.pathCells()).toHaveLength(1);
    expect(map.edgeBetween('#T1', '#T2')?.pathCoords).toEqual([{ x: 0, z: 1 }]);
  });

  it('throws when a path cell has fewer than two bridges', () => {
    // Single path cell touching only T1 — second open dirs all wall/empty.
    expect(() => constructHexCellMap([T(0, 0, 1), wide(0, 1), empty(0, 2)]))
      .toThrow(/has 1 bridges, expected exactly 2/);
  });

  it('throws when a path cell has zero bridges (isolated)', () => {
    expect(() => constructHexCellMap([empty(0, 0), wide(0, 1), empty(0, 2)]))
      .toThrow(/has 0 bridges, expected exactly 2/);
  });

  it('throws when a path cell has more than two bridges', () => {
    // Full path cell at (1,1) borders three territories via dirs 1, 3, 5 —
    // alternate neighbours, which are pairwise non-adjacent. Adjacent pairs
    // would trip the T-T adjacency check before the bridge count.
    const cells: HexCell[] = [
      T(0, 1, 1),                                     // dir 1 neighbour
      { kind: 'full', coord: { x: 1, z: 1 } },
      T(1, 2, 2),                                     // dir 3 neighbour
      T(2, 0, 3),                                     // dir 5 neighbour
    ];
    expect(() => constructHexCellMap(cells)).toThrow(/has 3 bridges, expected exactly 2/);
  });
});
