import type { ID } from '@battles/models';
import { HexCoord, HexDirection, HEX_DIR_CCW_PREV, HEX_DIRECTIONS, coordKey, toOffsetCoordinates, toOppositeDirection } from './HexCoordinates';
import { EdgeBuilder } from './EdgeBuilder';

export type TerritoryCell = { kind: 'territory'; coord: HexCoord; id: ID };
export type WidePathCell = { kind: 'wide'; coord: HexCoord; exclude: HexDirection };
export type NarrowPathCell = { kind: 'narrow'; coord: HexCoord; dirA: HexDirection; dirB: HexDirection };
/** All 6 directions open, all 7 tiles present. Used by the legacy ASCII grass parser. */
export type FullPathCell = { kind: 'full'; coord: HexCoord };
export type EmptyCell = { kind: 'empty'; coord: HexCoord };
export type HexCell = TerritoryCell | WidePathCell | NarrowPathCell | FullPathCell | EmptyCell;
export type PathCell = WidePathCell | NarrowPathCell | FullPathCell;

export function isPathCell(cell: HexCell): cell is PathCell {
  return cell.kind === 'wide' || cell.kind === 'narrow' || cell.kind === 'full';
}

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

/* Strict adjacency check for two narrow paths, which can be adjacent to each others cells
 * without being actually adjacent (e.g. A = E _5, B = 2_, dir = 4)
 *
 * The logic is a little asymmetric, because the cells have parity and
 * are partially offset
 * 
 * e.g. for cells A, B, dir = 4, A4 is adjacent to B1 + B2, but A5 is only adjacent to B1
 */
export function areNarrowPathsAdjacent(a: NarrowPathCell, dirAtoB: HexDirection, b: NarrowPathCell): boolean {
  const dirBtoA = toOppositeDirection(dirAtoB);
  const hasTile = (p: NarrowPathCell, idx: HexDirection) => p.dirA == idx || p.dirB == idx;
  const next = (idx: HexDirection) => (idx % 6) + 1 as HexDirection;
  return (
    hasTile(a, dirAtoB) && (hasTile(b, dirBtoA) || hasTile(b, next(dirBtoA)))
  ) || (
      hasTile(a, next(dirAtoB)) && hasTile(b, dirBtoA)
    )
}

function territoryNumber(id: ID): number {
  return parseInt(id.slice(2), 10);
}

/** Canonical (smaller-number-first) territory pair. Drives both edge IDs and pair keys. */
export function canonicalTerritoryPair(a: ID, b: ID): [ID, ID] {
  return territoryNumber(a) < territoryNumber(b) ? [a, b] : [b, a];
}

/** Edge ID convention shared with lobby-authored map JSON: `#T<a>#T<b>` with numerical order. */
export function edgeIdFor(a: ID, b: ID): ID {
  const [tA, tB] = canonicalTerritoryPair(a, b);
  return `${tA}${tB}` as ID;
}

function pairKey(a: ID, b: ID): string {
  const [tA, tB] = canonicalTerritoryPair(a, b);
  return `${tA}|${tB}`;
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

/** True iff `cell` has a tile present on the boundary facing `dir`. Territories always; empties never; paths via {@link isPathCellOpen}. */
function isCellOpen(cell: HexCell, dir: HexDirection): boolean {
  if (cell.kind === 'territory') return true;
  if (cell.kind === 'empty') return false;
  return isPathCellOpen(cell, dir);
}

/**
 * Build a HexCellMap from a flat list of parsed cells. Validates territory
 * uniqueness + no direct T-T adjacency, derives edges by flood-filling
 * reciprocal-open path-cell components, and orders each edge's pathCoords
 * T_A side → T_B side via BFS.
 */
export function constructHexCellMap(cells: readonly HexCell[]): HexCellMap {
  const grid = new Map<string, HexCell>();
  const territories: TerritoryCell[] = [];
  const paths: PathCell[] = [];

  for (const cell of cells) {
    grid.set(coordKey(cell.coord), cell);
    if (cell.kind === 'territory') territories.push(cell);
    else if (isPathCell(cell)) paths.push(cell);
  }

  // Validate unique territory IDs
  const seenIds = new Set<ID>();
  for (const t of territories) {
    if (seenIds.has(t.id)) throw new Error(`HexCellMap: duplicate territory ID ${t.id}`);
    seenIds.add(t.id);
  }

  // Single adjacency map over every non-empty cell.
  // Link a↔b iff both sides open toward each other (with narrow tile-pair check).
  // Walked from both sides; Set dedupes. Drives T-T validation, bridge count, flood-fill.
  const adj = new Map<string, Set<string>>();
  for (const cell of cells) {
    if (cell.kind === 'empty') continue;
    adj.set(coordKey(cell.coord), new Set());
  }
  for (const cell of cells) {
    if (cell.kind === 'empty') continue;
    const ck = coordKey(cell.coord);
    for (const dir of HEX_DIRECTIONS) {
      if (!isCellOpen(cell, dir)) continue;
      const [dx, dz] = toOffsetCoordinates(dir);
      const nk = coordKey({ x: cell.coord.x + dx, z: cell.coord.z + dz });
      const nCell = grid.get(nk);
      if (!nCell || !isCellOpen(nCell, toOppositeDirection(dir))) continue;
      if (cell.kind === 'narrow' && nCell.kind === 'narrow' && !areNarrowPathsAdjacent(cell, dir, nCell)) continue;
      adj.get(ck)!.add(nk);
    }
  }

  // Validate no direct T-T adjacency
  for (const t of territories) {
    for (const nk of adj.get(coordKey(t.coord))!) {
      const nCell = grid.get(nk)!;
      if (nCell.kind === 'territory') {
        throw new Error(`HexCellMap: territories ${t.id} and ${nCell.id} are directly adjacent`);
      }
    }
  }

  // Validate every path cell has exactly 2 bridges
  for (const p of paths) {
    const size = adj.get(coordKey(p.coord))!.size;
    if (size !== 2) {
      throw new Error(
        `HexCellMap: path cell at (${p.coord.x},${p.coord.z}) has ${size} bridges, expected exactly 2`
      );
    }
  }

  const edges = EdgeBuilder.from(adj, grid).toEdges();
  return new HexCellMap(grid, territories, paths, edges);
}
