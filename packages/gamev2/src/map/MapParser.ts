import { ID } from '@battles/models';
import { HexCoord, HexDirection, coordKey, toOffsetCoordinates, toOppositeDirection } from '../rendering/HexCoordinates';
import {
  HexCellMap,
  HexCell,
  TerritoryCell,
  PathCell,
  HexEdge,
  isPathCellOpen,
  edgeIdFor,
} from './HexCellMap';

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
      const c = dirB;
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
const HEX_DIRECTIONS: readonly HexDirection[] = [1, 2, 3, 4, 5, 6];

/**
 * Parses a markdown-table map into a HexCellMap.
 *
 * Format:
 * - `T <id>` = territory with explicit integer ID
 * - `E -<dir>` = wide path cell with closed direction (1-6)
 * - `E <dirA><dirB>` = narrow path cell open along two non-adjacent directions
 * - blank = empty cell
 *
 * Edges are derived by flood-filling connected path-cell components, then
 * collecting territories that bridge (reciprocal-open adjacency) into each
 * component. `HexEdge.pathCoords` are ordered T_A side → T_B side via BFS.
 */
export function parseMap(mapString: string): HexCellMap {
  const lines = mapString
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !SEPARATOR_ROW.test(l));

  const grid = new Map<string, HexCell>();
  const territories: TerritoryCell[] = [];
  const pathCells: PathCell[] = [];

  for (let row = 0; row < lines.length; row++) {
    const cells = lines[row].replace(/^\||\|$/g, '').split('|');
    for (let col = 0; col < cells.length; col++) {
      const coord: HexCoord = { x: row, z: col };
      const cell = parseCell(cells[col], row, col, coord);
      grid.set(coordKey(coord), cell);

      if (cell.kind === 'territory') territories.push(cell);
      else if (cell.kind === 'wide' || cell.kind === 'narrow') pathCells.push(cell);
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
    for (const dir of HEX_DIRECTIONS) {
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
  for (const p of pathCells) pathAdjacency.set(coordKey(p.coord), new Set());

  for (const p of pathCells) {
    const pk = coordKey(p.coord);
    for (const dir of HEX_DIRECTIONS) {
      if (!isPathCellOpen(p, dir)) continue;

      const [dx, dz] = toOffsetCoordinates(dir);
      const nCoord = { x: p.coord.x + dx, z: p.coord.z + dz };
      const nk = coordKey(nCoord);
      const nCell = pathCellByKey.get(nk);
      if (!nCell) continue;

      const opp = toOppositeDirection(dir);
      if (isPathCellOpen(nCell, opp)) {
        pathAdjacency.get(pk)!.add(nk);
        pathAdjacency.get(nk)!.add(pk);
      }
    }
  }

  // Warn about dangling opens and isolated path cells
  for (const p of pathCells) {
    let bridgeCount = 0;
    for (const dir of HEX_DIRECTIONS) {
      if (!isPathCellOpen(p, dir)) continue;

      const [dx, dz] = toOffsetCoordinates(dir);
      const nCoord = { x: p.coord.x + dx, z: p.coord.z + dz };
      const nCell = grid.get(coordKey(nCoord));

      if (!nCell || nCell.kind === 'empty') {
        console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir}`);
        continue;
      }

      if (nCell.kind === 'territory') {
        bridgeCount++;
        continue;
      }

      const opp = toOppositeDirection(dir);
      if (!isPathCellOpen(nCell, opp)) {
        console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir} (neighbor closed)`);
      } else {
        bridgeCount++;
      }
    }
    if (bridgeCount === 0) {
      console.warn(`MapParser: path cell at (${p.coord.x},${p.coord.z}) is isolated (no bridges)`);
    }
  }

  // Flood-fill connected path-cell components, collecting per-cell border territories
  type Component = {
    cells: string[]; // path-cell coord keys in arbitrary visit order
    borderTerritories: Set<ID>;
    cellsBorderingTerritory: Map<ID, Set<string>>;
  };

  const visited = new Set<string>();
  const components: Component[] = [];

  for (const p of pathCells) {
    const startKey = coordKey(p.coord);
    if (visited.has(startKey)) continue;

    const component: Component = {
      cells: [],
      borderTerritories: new Set(),
      cellsBorderingTerritory: new Map(),
    };
    const queue: string[] = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const cur = queue.pop()!;
      const curPath = pathCellByKey.get(cur)!;
      component.cells.push(cur);

      for (const dir of HEX_DIRECTIONS) {
        if (!isPathCellOpen(curPath, dir)) continue;
        const [dx, dz] = toOffsetCoordinates(dir);
        const nk = coordKey({ x: curPath.coord.x + dx, z: curPath.coord.z + dz });
        const nCell = grid.get(nk);
        if (nCell?.kind === 'territory') {
          component.borderTerritories.add(nCell.id);
          let set = component.cellsBorderingTerritory.get(nCell.id);
          if (!set) {
            set = new Set();
            component.cellsBorderingTerritory.set(nCell.id, set);
          }
          set.add(cur);
        }
      }

      for (const nk of pathAdjacency.get(cur)!) {
        if (!visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    components.push(component);
  }

  // BFS path-cell coords from seed set, in canonical order T_A → T_B
  const orderedCoordsFromSeeds = (component: Component, seeds: Set<string>): HexCoord[] => {
    const order: HexCoord[] = [];
    const seen = new Set<string>();
    const componentSet = new Set(component.cells);
    const queue: string[] = [];
    for (const s of seeds) {
      if (!seen.has(s) && componentSet.has(s)) {
        seen.add(s);
        queue.push(s);
      }
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      order.push(pathCellByKey.get(cur)!.coord);
      for (const nk of pathAdjacency.get(cur)!) {
        if (!seen.has(nk) && componentSet.has(nk)) {
          seen.add(nk);
          queue.push(nk);
        }
      }
    }
    return order;
  };

  // Emit edges. For repeated pairs across components, merge ordered pathCoords.
  const edgeByPair = new Map<string, HexEdge>();
  const pairKey = (a: ID, b: ID) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const component of components) {
    const tIds = [...component.borderTerritories];
    for (let i = 0; i < tIds.length; i++) {
      for (let j = i + 1; j < tIds.length; j++) {
        const ti = tIds[i];
        const tj = tIds[j];
        // Canonical T_A is numerically smaller (matches edgeIdFor convention)
        const na = parseInt(ti.slice(2), 10);
        const nb = parseInt(tj.slice(2), 10);
        const territoryA = na < nb ? ti : tj;
        const territoryB = na < nb ? tj : ti;

        const seeds = component.cellsBorderingTerritory.get(territoryA) ?? new Set();
        const ordered = orderedCoordsFromSeeds(component, seeds);

        const key = pairKey(territoryA, territoryB);
        const existing = edgeByPair.get(key);
        if (existing) {
          existing.pathCoords.push(...ordered);
        } else {
          edgeByPair.set(key, {
            id: edgeIdFor(territoryA, territoryB),
            territoryA,
            territoryB,
            pathCoords: ordered,
          });
        }
      }
    }
  }

  return new HexCellMap(grid, territories, pathCells, [...edgeByPair.values()]);
}
