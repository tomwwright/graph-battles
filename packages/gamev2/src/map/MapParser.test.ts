import { describe, it, expect } from 'vitest';
import { parseMap } from './MapParser';

describe('parseMap', () => {
  it('parses territories, path cells, and derives one edge', () => {
    // Minimal valid map: T1 — E -1 — T2 horizontally
    const map = '| T 1 | E -1 | T 2 |';

    const result = parseMap(map);

    expect(result.territories()).toHaveLength(2);
    expect(result.territories().map((t) => t.id).sort()).toEqual(['#T1', '#T2']);
    expect(result.pathCells()).toHaveLength(1);
    expect(result.edges()).toHaveLength(1);
    expect(result.edges()[0].id).toBe('#T1#T2');
  });

  it('skips markdown separator rows', () => {
    const map = [
      '| T 1 | E -1 | T 2 |',
      '|-----|------|-----|',
    ].join('\n');

    const result = parseMap(map);
    expect(result.territories()).toHaveLength(2);
    expect(result.pathCells()).toHaveLength(1);
  });

  it('throws on direct T-T adjacency', () => {
    expect(() => parseMap('| T 1 | T 2 |')).toThrow('directly adjacent');
  });

  it('throws on duplicate territory IDs', () => {
    expect(() => parseMap('| T 1 | E -1 | T 1 |')).toThrow('duplicate territory ID');
  });

  it('parses a narrow path cell with normalised dirA < dirB', () => {
    // E 53 should normalise to dirA=3, dirB=5. Two bridges: dir 3 → T1, dir 5 → T2.
    const map = [
      '|     | E 53 | T 1 |',
      '| T 2 |',
    ].join('\n');
    const result = parseMap(map);

    expect(result.pathCells()).toHaveLength(1);
    expect(result.pathCells()[0]).toMatchObject({ kind: 'narrow', dirA: 3, dirB: 5 });
  });

  it('throws on narrow path cell with same direction', () => {
    expect(() => parseMap('| T 1 | E 11 | T 2 |')).toThrow('dirA === dirB');
  });

  it('throws on adjacent narrow direction pair', () => {
    // dirs 1 and 2 are consecutive (adjacent) in the CW numbering
    expect(() => parseMap('| T 1 | E 12 | T 2 |')).toThrow('invalid narrow path pair');
  });

  it('derives an edge through a narrow path cell', () => {
    // E 35 at (0,1): dir 3 open → T1 at (0,2); dir 5 open → T2 at (1,0).
    // Row 1 has only 1 column, so (1,1) is off-grid (wall).
    const map = [
      '|     | E 35 | T 1 |',
      '| T 2 |',
    ].join('\n');

    const result = parseMap(map);
    expect(result.edges()).toHaveLength(1);
    expect([result.edges()[0].territoryA, result.edges()[0].territoryB].sort())
      .toEqual(['#T1', '#T2']);
  });
});
