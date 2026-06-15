import type { ID } from '@battles/models';
import { HexCoord, HexDirection, HEX_DIR_CCW_PREV, coordKey } from '../rendering/HexCoordinates';

export type TerritoryCell  = { kind: 'territory'; coord: HexCoord; id: ID };
export type WidePathCell   = { kind: 'wide';      coord: HexCoord; exclude: HexDirection };
export type NarrowPathCell = { kind: 'narrow';    coord: HexCoord; dirA: HexDirection; dirB: HexDirection };
export type EmptyCell      = { kind: 'empty';     coord: HexCoord };
export type HexCell        = TerritoryCell | WidePathCell | NarrowPathCell | EmptyCell;
export type PathCell       = WidePathCell | NarrowPathCell;

export type HexEdge = {
  id: ID;
  territoryA: ID;
  territoryB: ID;
  /** Ordered T_A side → T_B side via BFS at construction. */
  pathCoords: HexCoord[];
};

export function isPathCellOpen(cell: PathCell, dir: HexDirection): boolean {
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
