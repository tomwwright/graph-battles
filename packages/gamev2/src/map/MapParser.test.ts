import { describe, it, expect } from 'vitest';
import { parseMap } from './MapParser';

describe('parseMap', () => {
  it('parses territories, path cells, and derives edges', () => {
    const map = [
      '| T 1 | E -4 | T 3 | E -4 | T 2 |',
      '| E -2|      | E -2|      | E -2|',
      '| T 5 | E -2 | T 6 | E -2 | T 4 |',
    ].join('\n');

    const result = parseMap(map);

    expect(result.territories()).toHaveLength(6);
    expect(result.territories().map((t) => t.id).sort()).toEqual(['#T1', '#T2', '#T3', '#T4', '#T5', '#T6']);

    expect(result.pathCells()).toHaveLength(7);

    const edgePairs = result.edges()
      .map((e) => [e.territoryA, e.territoryB].sort().join('-'))
      .sort();
    expect(edgePairs).toEqual(['#T1-#T3', '#T1-#T5', '#T2-#T3', '#T2-#T4', '#T3-#T6', '#T4-#T6', '#T5-#T6']);
  });

  it('skips markdown separator rows', () => {
    const map = [
      '| T 1 | E -4 | T 3 | E -4 | T 2 |',
      '|-----|------|-----|------|-----|',
      '| E -2|      | E -2|      | E -2|',
      '| T 5 | E -2 | T 6 | E -2 | T 4 |',
    ].join('\n');

    const result = parseMap(map);
    expect(result.territories()).toHaveLength(6);
    expect(result.pathCells()).toHaveLength(7);
  });

  it('throws on direct T-T adjacency', () => {
    const map = '| T 1 | T 2 |';
    expect(() => parseMap(map)).toThrow('directly adjacent');
  });

  it('throws on duplicate territory IDs', () => {
    const map = [
      '| T 1 | E -2 | T 1 |',
    ].join('\n');
    expect(() => parseMap(map)).toThrow('duplicate territory ID');
  });

  it('parses narrow path cells', () => {
    // E 35: dirs 3(E) and 5(SW) — not adjacent in new numbering
    const map = [
      '|     |      |     |',
      '|     | E 35 | T 1 |',
      '| T 2 |      |     |',
    ].join('\n');
    const result = parseMap(map);
    expect(result.pathCells()).toHaveLength(1);
    expect(result.pathCells()[0]).toMatchObject({ kind: 'narrow', dirA: 3, dirB: 5 });
  });

  it('throws on narrow path cell with same direction', () => {
    const map = '| T 1 | E 11 | T 2 |';
    expect(() => parseMap(map)).toThrow('dirA === dirB');
  });

  it('throws on adjacent direction pair', () => {
    // dirs 1 and 2 are consecutive (adjacent) in new CW numbering
    const map = '| T 1 | E 12 | T 2 |';
    expect(() => parseMap(map)).toThrow('invalid narrow path pair');
  });

  it('derives edges through narrow path cells', () => {
    // E 35 at (1,1): open dir3→(1,2)=T1, dir5→(2,0)=T2
    const map = [
      '|     |      |     |',
      '|     | E 35 | T 1 |',
      '| T 2 |      |     |',
    ].join('\n');
    const result = parseMap(map);
    expect(result.pathCells()).toHaveLength(1);
    expect(result.pathCells()[0]).toMatchObject({ kind: 'narrow', dirA: 3, dirB: 5 });
    expect(result.edges()).toHaveLength(1);
    expect([result.edges()[0].territoryA, result.edges()[0].territoryB].sort()).toEqual(['#T1', '#T2']);
  });
});
