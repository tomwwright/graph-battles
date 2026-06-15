import { ID } from '@battles/models';
import { HexCoord, HexDirection, PathCell, coordKey, toOffsetCoordinates, isPathDirectionOpen, toOppositeDirection } from '../rendering/HexCoordinates';

export type { PathCell };

export type RenderMap = {
  territories: { id: ID; coord: HexCoord }[];
  pathCells: PathCell[];
  edges: { territoryA: ID; territoryB: ID; pathCoords: HexCoord[] }[];
};

type ParsedCell =
  | { type: 'empty' }
  | { type: 'territory'; id: ID }
  | { type: 'path'; exclude: HexDirection }
  | { type: 'path-narrow'; dirA: HexDirection; dirB: HexDirection };

function isOpen(cell: ParsedCell, dir: HexDirection): boolean {
  if (cell.type === 'territory') return true;
  if (cell.type === 'path') return cell.exclude !== dir;
  if (cell.type === 'path-narrow') return cell.dirA === dir || cell.dirB === dir;
  return false;
}

function parseCell(raw: string, row: number, col: number): ParsedCell {
  const s = raw.trim();
  if (s === '') return { type: 'empty' };

  const tMatch = s.match(/^T\s*(\d+)$/);
  if (tMatch) return { type: 'territory', id: `#T${tMatch[1]}` };

  const eMatch = s.match(/^E\s*-([1-6])$/); // e.g. E -1
  if (eMatch) return { type: 'path', exclude: parseInt(eMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6 };

  const nMatch = s.match(/^E\s*([1-6])([1-6])$/); // e.g. E 12
  if (nMatch) {
    let dirA = parseInt(nMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6;
    let dirB = parseInt(nMatch[2]) as 1 | 2 | 3 | 4 | 5 | 6;
    if (dirA === dirB) throw new Error(`MapParser: path-narrow cell at (${row},${col}) has dirA === dirB`);

    if (dirA > dirB) {
      const c = dirB;
      dirA = dirB;
      dirB = c;
    }

    // Adjacent pairs are not valid
    const invalidPairs: Record<1 | 2 | 3 | 4 | 5 | 6, (1 | 2 | 3 | 4 | 5 | 6)[]> = {
      1: [2, 6],
      2: [1, 3],
      3: [2, 4],
      4: [3, 5],
      5: [4, 6],
      6: [5, 1],
    }
    if (invalidPairs[dirA].includes(dirB)) {
      throw new Error(`MapParser: invalid narrow path pair (${dirA}, ${dirB})`);
    }

    return { type: 'path-narrow', dirA, dirB };
  }

  throw new Error(`MapParser: unrecognized cell at (${row},${col}): "${s}"`);
}

const SEPARATOR_ROW = /^\|[-:\s|]+\|$/;

/**
 * Parses a markdown-table map into a RenderMap.
 *
 * Format:
 * - `T <id>` = territory with explicit integer ID
 * - `E -<dir>` = path cell with closed direction (1-6)
 * - blank = empty cell
 *
 * Edges are derived by flood-filling connected path-cell components, then
 * collecting territories that bridge (reciprocal-open adjacency) into each
 * component.
 */
export function parseMap(mapString: string): RenderMap {
  const lines = mapString
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !SEPARATOR_ROW.test(l));

  // Build 2D cell grid indexed by [row][col]
  const grid = new Map<string, ParsedCell>();
  const territories: RenderMap['territories'] = [];
  const pathCells: RenderMap['pathCells'] = [];

  for (let row = 0; row < lines.length; row++) {
    const cells = lines[row].replace(/^\||\|$/g, '').split('|');
    for (let col = 0; col < cells.length; col++) {
      const cell = parseCell(cells[col], row, col);
      const coord: HexCoord = { x: row, z: col };
      const key = coordKey(coord);
      grid.set(key, cell);

      if (cell.type === 'territory') {
        territories.push({ id: cell.id, coord });
      } else if (cell.type === 'path') {
        pathCells.push({ coord, kind: 'wide', exclude: cell.exclude });
      } else if (cell.type === 'path-narrow') {
        pathCells.push({ coord, kind: 'narrow', dirA: cell.dirA, dirB: cell.dirB });
      }
    }
  }

  // Validate unique territory IDs
  const seenIds = new Set<ID>();
  for (const t of territories) {
    if (seenIds.has(t.id)) throw new Error(`MapParser: duplicate territory ID ${t.id}`);
    seenIds.add(t.id);
  }

  // Validate no direct T-T adjacency
  const territoryByKey = new Map(territories.map((t) => [coordKey(t.coord), t.id]));
  for (const t of territories) {
    for (let di = 0; di < 6; di++) {
      const dir = (di + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      const [dx, dz] = toOffsetCoordinates(dir);
      const nKey = coordKey({ x: t.coord.x + dx, z: t.coord.z + dz });
      if (territoryByKey.has(nKey)) {
        throw new Error(`MapParser: territories ${t.id} and ${territoryByKey.get(nKey)} are directly adjacent`);
      }
    }
  }

  // Build path-cell adjacency (reciprocal-open links between path cells)
  const pathCellByKey = new Map(pathCells.map((p) => [coordKey(p.coord), p]));
  const pathAdjacency = new Map<string, Set<string>>();
  for (const p of pathCells) {
    pathAdjacency.set(coordKey(p.coord), new Set());
  }

  for (const p of pathCells) {
    const pk = coordKey(p.coord);
    for (let di = 0; di < 6; di++) {
      const dir = (di + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      if (!isPathDirectionOpen(p, dir)) continue;

      const [dx, dz] = toOffsetCoordinates(dir);
      const nCoord = { x: p.coord.x + dx, z: p.coord.z + dz };
      const nk = coordKey(nCoord);
      const nCell = pathCellByKey.get(nk);
      if (!nCell) continue;

      const opp = toOppositeDirection(dir);
      if (isPathDirectionOpen(nCell, opp)) {
        pathAdjacency.get(pk)!.add(nk);
        pathAdjacency.get(nk)!.add(pk);
      }
    }
  }

  // Warn about dangling opens and isolated path cells
  for (const p of pathCells) {
    let bridgeCount = 0;
    for (let di = 0; di < 6; di++) {
      const dir = (di + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      if (!isPathDirectionOpen(p, dir)) continue;

      const [dx, dz] = toOffsetCoordinates(dir);
      const nCoord = { x: p.coord.x + dx, z: p.coord.z + dz };
      const nk = coordKey(nCoord);
      const nCell = grid.get(nk);

      if (!nCell || nCell.type === 'empty') {
        console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir}`);
        continue;
      }

      if (nCell.type === 'territory') {
        bridgeCount++;
        continue;
      }

      if (nCell.type === 'path' || nCell.type === 'path-narrow') {
        const opp = toOppositeDirection(dir);
        if (!isOpen(nCell, opp)) {
          console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir} (neighbor closed)`);
        } else {
          bridgeCount++;
        }
      }
    }
    if (bridgeCount === 0) {
      console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) is isolated (no bridges)`);
    }
  }

  // Flood-fill connected path-cell components
  const visited = new Set<string>();
  const edges: RenderMap['edges'] = [];
  const edgeSet = new Set<string>();

  for (const p of pathCells) {
    const startKey = coordKey(p.coord);
    if (visited.has(startKey)) continue;

    const component: HexCoord[] = [];
    const borderTerritories = new Set<ID>();
    const queue: string[] = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const cur = queue.pop()!;
      const curPath = pathCellByKey.get(cur)!;
      component.push(curPath.coord);

      // Collect bordering territories
      for (let di = 0; di < 6; di++) {
        const dir = (di + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        if (!isPathDirectionOpen(curPath, dir)) continue;

        const [dx, dz] = toOffsetCoordinates(dir);
        const nk = coordKey({ x: curPath.coord.x + dx, z: curPath.coord.z + dz });
        const nCell = grid.get(nk);
        if (nCell?.type === 'territory') borderTerritories.add(nCell.id);
      }

      // Expand to adjacent path cells
      for (const nk of pathAdjacency.get(cur)!) {
        if (!visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    // Emit edges for every pair of bordering territories
    const tIds = [...borderTerritories];
    for (let i = 0; i < tIds.length; i++) {
      for (let j = i + 1; j < tIds.length; j++) {
        const a = tIds[i] < tIds[j] ? tIds[i] : tIds[j];
        const b = tIds[i] < tIds[j] ? tIds[j] : tIds[i];
        const ek = `${a}${b}`;
        if (!edgeSet.has(ek)) {
          edgeSet.add(ek);
          edges.push({ territoryA: a, territoryB: b, pathCoords: component });
        } else {
          // Merge pathCoords from this component into existing edge
          const existing = edges.find((e) => e.territoryA === a && e.territoryB === b)!;
          existing.pathCoords = [...existing.pathCoords, ...component];
        }
      }
    }
  }

  return { territories, pathCells, edges };
}

/**
 * @deprecated Legacy ASCII-grid parser. Use `parseMap` (markdown-table format) instead.
 *
 * Format:
 * - `T` = territory
 * - `g` = grass (filler, also used for edge derivation)
 * - `_` = empty
 *
 * Edges are derived from adjacency: two territories share an edge if they
 * are both adjacent to the same grass cell.
 */
export function parseMapLegacy(mapString: string): {
  territories: { id: ID; coord: HexCoord }[];
  grassCells: HexCoord[];
  edges: { territoryA: ID; territoryB: ID; grassCoords: HexCoord[] }[];
} {
  const lines = mapString
    .trim()
    .split('\n')
    .map((l) => l.trim());

  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));

  // Build grid
  const grid: string[][] = [];
  for (let x = 0; x < rows; x++) {
    grid[x] = [];
    for (let z = 0; z < cols; z++) {
      grid[x][z] = lines[x]?.[z] ?? '_';
    }
  }

  // Extract territories and grass cells
  const territories: { id: ID; coord: HexCoord }[] = [];
  const grassCells: HexCoord[] = [];
  let nextTerritoryId = 1;

  // Map from coord key to territory ID for adjacency lookup
  const territoryAt = new Map<string, ID>();

  for (let x = 0; x < rows; x++) {
    for (let z = 0; z < cols; z++) {
      const cell = grid[x][z];
      const coord: HexCoord = { x, z };

      if (cell === 'T') {
        const id = `#T${nextTerritoryId++}`;
        territories.push({ id, coord });
        territoryAt.set(coordKey(coord), id);
      } else if (cell === 'g') {
        grassCells.push(coord);
      }
    }
  }

  // Derive edges by flood-filling connected grass regions.
  // Each connected grass component that touches 2+ territories creates edges
  // between every pair of those territories.
  const grassSet = new Set(grassCells.map(coordKey));
  const visited = new Set<string>();
  const edges: { territoryA: ID; territoryB: ID; grassCoords: HexCoord[] }[] = [];
  const edgeSet = new Set<string>();

  for (const grass of grassCells) {
    const startKey = coordKey(grass);
    if (visited.has(startKey)) continue;

    // Flood-fill this connected grass component
    const component: HexCoord[] = [];
    const adjacentTerritoryIds = new Set<ID>();
    const queue: HexCoord[] = [grass];
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.pop()!;
      component.push(current);

      for (const neighbour of hexNeighbours(current)) {
        const key = coordKey(neighbour);

        // Check if neighbour is a territory
        const tId = territoryAt.get(key);
        if (tId) {
          adjacentTerritoryIds.add(tId);
          continue;
        }

        // Expand into unvisited grass
        if (grassSet.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push(neighbour);
        }
      }
    }

    // Every pair of adjacent territories gets an edge via this grass component
    const tIds = [...adjacentTerritoryIds];
    for (let i = 0; i < tIds.length; i++) {
      for (let j = i + 1; j < tIds.length; j++) {
        const a = tIds[i];
        const b = tIds[j];
        const edgeKey = a < b ? `${a}${b}` : `${b}${a}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            territoryA: a < b ? a : b,
            territoryB: a < b ? b : a,
            grassCoords: component
          });
        }
      }
    }
  }

  return { territories, grassCells, edges };
}

/**
 * Returns the 6 hex neighbours using axial directions.
 * Hex coordinates are axial (mapped to tile offset coords via stride vectors
 * in HexCoordinates.ts), so no parity logic is needed here.
 */
function hexNeighbours(coord: HexCoord): HexCoord[] {
  const { x, z } = coord;
  return [
    { x: x + 1, z },
    { x: x - 1, z },
    { x, z: z + 1 },
    { x, z: z - 1 },
    { x: x + 1, z: z - 1 },
    { x: x - 1, z: z + 1 },
  ];
}
