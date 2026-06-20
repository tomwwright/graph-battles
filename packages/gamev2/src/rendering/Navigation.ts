import { Vector3 } from '@babylonjs/core';
import type { ID } from '@battles/models';
import type { HexCellMap, HexEdge } from '../map/HexCellMap';
import { HexCoord, hexCenterTile, hexToTileCoords, toPathCellIndices, toNarrowPathCellIndices } from '../map/HexCoordinates';
import type { HexGridController } from './HexGridController';

/**
 * Projects HexCoord-space queries into world-space Vector3 positions for the
 * renderer. All positions are returned with `y = 0`; callers lift to their
 * preferred height.
 */
export class Navigation {
  constructor(
    private readonly map: HexCellMap,
    private readonly grid: HexGridController,
  ) { }

  /** Visual centre of a hex cell. Territory → center tile world pos. Path cell → centroid of present tiles. */
  cellCenter(coord: HexCoord): Vector3 {
    const cell = this.map.cellAt(coord);
    if (cell?.kind === 'wide' || cell?.kind === 'narrow') {
      const present = cell.kind === 'wide'
        ? toPathCellIndices(cell.exclude)
        : toNarrowPathCellIndices(cell.dirA, cell.dirB);
      const tiles = hexToTileCoords(coord);
      let sumX = 0;
      let sumZ = 0;
      for (const i of present) {
        const p = this.grid.getWorldPosition(tiles[i]);
        sumX += p.x;
        sumZ += p.z;
      }
      return new Vector3(sumX / present.length, 0, sumZ / present.length);
    }
    // territory, full path cell, empty, or unknown — use centre tile
    const tile = hexCenterTile(coord);
    const pos = this.grid.getWorldPosition(tile);
    return new Vector3(pos.x, 0, pos.z);
  }

  /** Centre of a game location (territory or edge ID). */
  locationCenter(locationId: ID): Vector3 | null {
    const territoryCoord = this.map.territoryCoord(locationId);
    if (territoryCoord) return this.cellCenter(territoryCoord);

    const edge = this.map.edgeById(locationId);
    if (edge) return this.edgeCenter(edge);

    return null;
  }

  /**
   * Waypoints between two locations. y = 0.
   *
   * - T_A → E_AB: T_A-side half of pathCoords, projected.
   * - E_AB → T_A: above reversed.
   * - T_A → T_B: full pathCoords from T_A side.
   * - E → E: [].
   *
   * Endpoint positions (cell or location centre) are NOT included — the caller
   * is responsible for prepending/appending its own start/end positions.
   */
  path(fromLocationId: ID, toLocationId: ID): Vector3[] {
    const from = this.resolveLocation(fromLocationId);
    const to = this.resolveLocation(toLocationId);
    if (!from || !to) return [];

    if (from.kind === 'territory' && to.kind === 'territory') {
      const edge = this.map.edgeBetween(from.id, to.id);
      if (!edge) return [];
      const oriented = this.orientPathCoords(edge, from.id);
      return oriented.map((c) => this.cellCenter(c));
    }

    if (from.kind === 'territory' && to.kind === 'edge') {
      const half = this.halfChain(to.edge, from.id);
      return half.map((c) => this.cellCenter(c));
    }

    if (from.kind === 'edge' && to.kind === 'territory') {
      const half = this.halfChain(from.edge, to.id);
      return half.reverse().map((c) => this.cellCenter(c));
    }

    return [];
  }

  private resolveLocation(id: ID):
    | { kind: 'territory'; id: ID }
    | { kind: 'edge'; edge: HexEdge }
    | null {
    if (this.map.territoryCoord(id)) return { kind: 'territory', id };
    const edge = this.map.edgeById(id);
    if (edge) return { kind: 'edge', edge };
    return null;
  }

  /** Return pathCoords ordered with `fromTerritoryId` at index 0. */
  private orientPathCoords(edge: HexEdge, fromTerritoryId: ID): HexCoord[] {
    return fromTerritoryId === edge.territoryA
      ? [...edge.pathCoords]
      : [...edge.pathCoords].reverse();
  }

  /** Half-chain of an edge from the named territory's side, excluding the edge centre. */
  private halfChain(edge: HexEdge, fromTerritoryId: ID): HexCoord[] {
    const oriented = this.orientPathCoords(edge, fromTerritoryId);
    return oriented.slice(0, Math.floor(oriented.length / 2));
  }

  private edgeCenter(edge: HexEdge): Vector3 | null {
    const n = edge.pathCoords.length;
    if (n === 0) return null;
    if (n % 2 !== 0) {
      return this.cellCenter(edge.pathCoords[Math.floor(n / 2)]);
    }
    const a = this.cellCenter(edge.pathCoords[n / 2 - 1]);
    const b = this.cellCenter(edge.pathCoords[n / 2]);
    return new Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
  }
}
