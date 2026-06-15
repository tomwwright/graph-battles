import type { ID } from '@battles/models';
import { HexCoord, HexDirection, HEX_DIR_CCW_PREV, coordKey, toOffsetCoordinates, toOppositeDirection } from '../rendering/HexCoordinates';

export type TerritoryCell = { kind: 'territory'; coord: HexCoord; id: ID };
export type WidePathCell = { kind: 'wide'; coord: HexCoord; exclude: HexDirection };
export type NarrowPathCell = { kind: 'narrow'; coord: HexCoord; dirA: HexDirection; dirB: HexDirection };
/** All 6 directions open, all 7 tiles present. Used by the legacy ASCII grass parser. */
export type FullPathCell = { kind: 'full'; coord: HexCoord };
export type EmptyCell = { kind: 'empty'; coord: HexCoord };
export type HexCell = TerritoryCell | WidePathCell | NarrowPathCell | FullPathCell | EmptyCell;
export type PathCell = WidePathCell | NarrowPathCell | FullPathCell;

export type HexEdge = {
  id: ID;
  territoryA: ID;
  territoryB: ID;
  /** Ordered T_A side → T_B side via BFS at construction. */
  pathCoords: HexCoord[];
};

export function isPathCellOpen(cell: PathCell, dir: HexDirection): boolean {
  if (cell.kind === 'full') return true;
  if (cell.kind === 'wide') return cell.exclude !== dir;
  return cell.dirA === dir || HEX_DIR_CCW_PREV[cell.dirA] === dir
    || cell.dirB === dir || HEX_DIR_CCW_PREV[cell.dirB] === dir;
}

/** Edge ID convention shared with lobby-authored map JSON: `#T<a>#T<b>` with numerical order. */
export function edgeIdFor(a: ID, b: ID): ID {
  const na = parseInt(a.slice(2), 10);
  const nb = parseInt(b.slice(2), 10);
  return (na < nb ? `${a}${b}` : `${b}${a}`) as ID;
}

function pairKey(a: ID, b: ID): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export class HexCellMap {
  private readonly cellByCoord: ReadonlyMap<string, HexCell>;
  private readonly _territories: readonly TerritoryCell[];
  private readonly _pathCells: readonly PathCell[];
  private readonly _edges: readonly HexEdge[];

  private readonly territoryByIdMap = new Map<ID, TerritoryCell>();
  private readonly territoryByCoordKey = new Map<string, TerritoryCell>();
  private readonly edgeByIdMap = new Map<ID, HexEdge>();
  private readonly edgeByPairKey = new Map<string, HexEdge>();
  private readonly edgeByCoordKey = new Map<string, HexEdge>();

  constructor(
    grid: ReadonlyMap<string, HexCell>,
    territories: readonly TerritoryCell[],
    pathCells: readonly PathCell[],
    edges: readonly HexEdge[],
  ) {
    this.cellByCoord = grid;
    this._territories = territories;
    this._pathCells = pathCells;
    this._edges = edges;

    for (const t of territories) {
      this.territoryByIdMap.set(t.id, t);
      this.territoryByCoordKey.set(coordKey(t.coord), t);
    }
    for (const e of edges) {
      this.edgeByIdMap.set(e.id, e);
      this.edgeByPairKey.set(pairKey(e.territoryA, e.territoryB), e);
      for (const pc of e.pathCoords) {
        this.edgeByCoordKey.set(coordKey(pc), e);
      }
    }
  }

  cellAt(coord: HexCoord): HexCell | undefined {
    return this.cellByCoord.get(coordKey(coord));
  }

  territories(): readonly TerritoryCell[] {
    return this._territories;
  }

  pathCells(): readonly PathCell[] {
    return this._pathCells;
  }

  edges(): readonly HexEdge[] {
    return this._edges;
  }

  territoryCoord(id: ID): HexCoord | undefined {
    return this.territoryByIdMap.get(id)?.coord;
  }

  territoryAtCoord(coord: HexCoord): TerritoryCell | undefined {
    return this.territoryByCoordKey.get(coordKey(coord));
  }

  edgeById(id: ID): HexEdge | undefined {
    return this.edgeByIdMap.get(id);
  }

  edgeBetween(territoryA: ID, territoryB: ID): HexEdge | undefined {
    return this.edgeByPairKey.get(pairKey(territoryA, territoryB));
  }

  edgeAtCoord(coord: HexCoord): HexEdge | undefined {
    return this.edgeByCoordKey.get(coordKey(coord));
  }
}

const HEX_DIRECTIONS: readonly HexDirection[] = [1, 2, 3, 4, 5, 6];

/**
 * Build a HexCellMap from a flat list of parsed cells. Validates territory
 * uniqueness + no direct T-T adjacency, derives edges by flood-filling
 * reciprocal-open path-cell components, orders each edge's pathCoords
 * T_A side → T_B side via BFS, and emits warnings on dangling opens and
 * isolated path cells.
 *
 */
export function constructHexCellMap(cells: readonly HexCell[]): HexCellMap {
  const grid = new Map<string, HexCell>();
  const territories: TerritoryCell[] = [];
  const pathCells: PathCell[] = [];

  for (const cell of cells) {
    grid.set(coordKey(cell.coord), cell);
    if (cell.kind === 'territory') territories.push(cell);
    else if (cell.kind === 'wide' || cell.kind === 'narrow' || cell.kind === 'full') pathCells.push(cell);
  }

  // Validate unique territory IDs
  const seenIds = new Set<ID>();
  for (const t of territories) {
    if (seenIds.has(t.id)) throw new Error(`HexCellMap: duplicate territory ID ${t.id}`);
    seenIds.add(t.id);
  }

  // Validate no direct T-T adjacency
  const territoryByKey = new Map(territories.map((t) => [coordKey(t.coord), t.id]));
  for (const t of territories) {
    for (const dir of HEX_DIRECTIONS) {
      const [dx, dz] = toOffsetCoordinates(dir);
      const nKey = coordKey({ x: t.coord.x + dx, z: t.coord.z + dz });
      if (territoryByKey.has(nKey)) {
        throw new Error(`HexCellMap: territories ${t.id} and ${territoryByKey.get(nKey)} are directly adjacent`);
      }
    }
  }

  // Path-cell adjacency: reciprocal-open links between path cells
  const pathCellByKey = new Map(pathCells.map((p) => [coordKey(p.coord), p]));
  const pathAdjacency = new Map<string, Set<string>>();
  for (const p of pathCells) pathAdjacency.set(coordKey(p.coord), new Set());

  for (const p of pathCells) {
    const pk = coordKey(p.coord);
    for (const dir of HEX_DIRECTIONS) {
      if (!isPathCellOpen(p, dir)) continue;

      const [dx, dz] = toOffsetCoordinates(dir);
      const nk = coordKey({ x: p.coord.x + dx, z: p.coord.z + dz });
      const nCell = pathCellByKey.get(nk);
      if (!nCell) continue;

      if (isPathCellOpen(nCell, toOppositeDirection(dir))) {
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
      const nCell = grid.get(coordKey({ x: p.coord.x + dx, z: p.coord.z + dz }));

      if (!nCell || nCell.kind === 'empty') {
        console.warn(`HexCellMap: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir}`);
        continue;
      }
      if (nCell.kind === 'territory') {
        bridgeCount++;
        continue;
      }
      if (!isPathCellOpen(nCell, toOppositeDirection(dir))) {
        console.warn(`HexCellMap: path cell at (${p.coord.x},${p.coord.z}) has dangling open in dir ${dir} (neighbor closed)`);
      } else {
        bridgeCount++;
      }
    }
    if (bridgeCount === 0) {
      console.warn(`HexCellMap: path cell at (${p.coord.x},${p.coord.z}) is isolated (no bridges)`);
    }
  }

  // Flood-fill components; track which cells border each territory
  type Component = {
    cells: Set<string>;
    borderTerritories: Set<ID>;
    cellsBorderingTerritory: Map<ID, Set<string>>;
  };

  const visited = new Set<string>();
  const components: Component[] = [];

  for (const p of pathCells) {
    const startKey = coordKey(p.coord);
    if (visited.has(startKey)) continue;

    const component: Component = {
      cells: new Set(),
      borderTerritories: new Set(),
      cellsBorderingTerritory: new Map(),
    };
    const queue: string[] = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const cur = queue.pop()!;
      const curPath = pathCellByKey.get(cur)!;
      component.cells.add(cur);

      for (const dir of HEX_DIRECTIONS) {
        if (!isPathCellOpen(curPath, dir)) continue;
        const [dx, dz] = toOffsetCoordinates(dir);
        const nCell = grid.get(coordKey({ x: curPath.coord.x + dx, z: curPath.coord.z + dz }));
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

  // BFS coords from seed set in canonical order
  const orderedCoordsFromSeeds = (component: Component, seeds: Set<string>): HexCoord[] => {
    const order: HexCoord[] = [];
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const s of seeds) {
      if (!seen.has(s) && component.cells.has(s)) {
        seen.add(s);
        queue.push(s);
      }
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      order.push(pathCellByKey.get(cur)!.coord);
      for (const nk of pathAdjacency.get(cur)!) {
        if (!seen.has(nk) && component.cells.has(nk)) {
          seen.add(nk);
          queue.push(nk);
        }
      }
    }
    return order;
  };

  // Emit edges. T_A is numerically smaller territory (matches edgeIdFor).
  const edgeByPair = new Map<string, HexEdge>();

  for (const component of components) {
    const tIds = [...component.borderTerritories];
    for (let i = 0; i < tIds.length; i++) {
      for (let j = i + 1; j < tIds.length; j++) {
        const ti = tIds[i];
        const tj = tIds[j];
        const na = parseInt(ti.slice(2), 10);
        const nb = parseInt(tj.slice(2), 10);
        const territoryA = na < nb ? ti : tj;
        const territoryB = na < nb ? tj : ti;

        const seeds = component.cellsBorderingTerritory.get(territoryA) ?? new Set<string>();
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
