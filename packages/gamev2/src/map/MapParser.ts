import { HexCoord, HexDirection } from '../rendering/HexCoordinates';
import { HexCellMap, HexCell, constructHexCellMap } from './HexCellMap';

function parseCell(raw: string, row: number, col: number, coord: HexCoord): HexCell {
  const s = raw.trim();
  if (s === '') return { kind: 'empty', coord };

  const tMatch = s.match(/^T\s*(\d+)$/);
  if (tMatch) return { kind: 'territory', coord, id: `#T${tMatch[1]}` };

  const eMatch = s.match(/^E\s*-([1-6])$/);
  if (eMatch) return { kind: 'wide', coord, exclude: parseInt(eMatch[1]) as HexDirection };

  const nMatch = s.match(/^E\s*([1-6])([1-6])$/);
  if (nMatch) {
    let dirA = parseInt(nMatch[1]) as HexDirection;
    let dirB = parseInt(nMatch[2]) as HexDirection;
    if (dirA === dirB) throw new Error(`MapParser: path-narrow cell at (${row},${col}) has dirA === dirB`);

    if (dirA > dirB) {
      const c = dirA;
      dirA = dirB;
      dirB = c;
    }

    const invalidPairs: Record<HexDirection, HexDirection[]> = {
      1: [2, 6],
      2: [1, 3],
      3: [2, 4],
      4: [3, 5],
      5: [4, 6],
      6: [5, 1],
    };
    if (invalidPairs[dirA].includes(dirB)) {
      throw new Error(`MapParser: invalid narrow path pair (${dirA}, ${dirB})`);
    }

    return { kind: 'narrow', coord, dirA, dirB };
  }

  throw new Error(`MapParser: unrecognized cell at (${row},${col}): "${s}"`);
}

const SEPARATOR_ROW = /^\|[-:\s|]+\|$/;

/**
 * Parses a markdown-table map into a HexCellMap.
 *
 * Format:
 * - `T <id>` = territory with explicit integer ID
 * - `E -<dir>` = wide path cell with closed direction (1-6)
 * - `E <dirA><dirB>` = narrow path cell open along two non-adjacent directions
 * - blank = empty cell
 *
 * Only lifts text → cells. Adjacency, edge derivation, and validation are
 * delegated to `constructHexCellMap`.
 */
export function parseMap(mapString: string): HexCellMap {
  const lines = mapString
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !SEPARATOR_ROW.test(l));

  const cells: HexCell[] = [];
  for (let row = 0; row < lines.length; row++) {
    const rawCells = lines[row].replace(/^\||\|$/g, '').split('|');
    for (let col = 0; col < rawCells.length; col++) {
      const coord: HexCoord = { x: row, z: col };
      cells.push(parseCell(rawCells[col], row, col, coord));
    }
  }

  return constructHexCellMap(cells);
}

/**
 * @deprecated Legacy ASCII-grid parser. Use `parseMap` (markdown-table format) instead.
 *
 * Format:
 * - `T` = territory (auto-numbered #T1, #T2, … in row-major order)
 * - `g` = grass (full path cell — all six directions open)
 * - `_` = empty
 *
 * Lifts text → HexCell[] and delegates edge derivation to `constructHexCellMap`.
 */
export function parseMapLegacy(mapString: string): HexCellMap {
  const lines = mapString
    .trim()
    .split('\n')
    .map((l) => l.trim());

  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));

  const cells: HexCell[] = [];
  let nextTerritoryId = 1;

  for (let x = 0; x < rows; x++) {
    for (let z = 0; z < cols; z++) {
      const ch = lines[x]?.[z] ?? '_';
      const coord: HexCoord = { x, z };
      if (ch === 'T') {
        cells.push({ kind: 'territory', coord, id: `#T${nextTerritoryId++}` });
      } else if (ch === 'g') {
        cells.push({ kind: 'full', coord });
      } else {
        cells.push({ kind: 'empty', coord });
      }
    }
  }

  return constructHexCellMap(cells);
}
