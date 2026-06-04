import { describe, it, expect } from 'vitest';
import { parseMap } from './MapParser';

describe('parseMap', () => {
  it('parses territories, path cells, and derives edges', () => {
    const map = [
      '| T 1 | E -1 | T 3 | E -1 | T 2 |',
      '| E -6|      | E -6|      | E -6|',
      '| T 5 | E -6 | T 6 | E -6 | T 4 |',
    ].join('\n');

    const result = parseMap(map);

    expect(result.territories).toHaveLength(6);
    expect(result.territories.map((t) => t.id).sort()).toEqual(['#T1', '#T2', '#T3', '#T4', '#T5', '#T6']);

    expect(result.pathCells).toHaveLength(7);

    const edgePairs = result.edges
      .map((e) => [e.territoryA, e.territoryB].sort().join('-'))
      .sort();
    expect(edgePairs).toEqual(['#T1-#T3', '#T1-#T5', '#T2-#T3', '#T2-#T4', '#T3-#T6', '#T4-#T6', '#T5-#T6']);
  });

  it('skips markdown separator rows', () => {
    const map = [
      '| T 1 | E -1 | T 3 | E -1 | T 2 |',
      '|-----|------|-----|------|-----|',
      '| E -6|      | E -6|      | E -6|',
      '| T 5 | E -6 | T 6 | E -6 | T 4 |',
    ].join('\n');

    const result = parseMap(map);
    expect(result.territories).toHaveLength(6);
    expect(result.pathCells).toHaveLength(7);
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
});
