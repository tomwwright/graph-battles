import type { ID } from '@battles/models';
import { HexCell, HexEdge, canonicalTerritoryPair, edgeIdFor, isPathCell } from './HexCellMap';
import { HexCoord, coordKey } from './HexCoordinates';

/** A connected piece of the path-cell graph plus the territories its cells border. */
type Segment = {
  cells: Set<string>;
  borders: Map<ID, Set<string>>;
};

function pairKey(a: ID, b: ID): string {
  const [tA, tB] = canonicalTerritoryPair(a, b);
  return `${tA}|${tB}`;
}

/**
 * Derives canonical `HexEdge[]` from a validated path-cell graph. Owns flood-fill
 * (segments + visited tracking), per-segment BFS ordering, and cross-segment
 * pair dedup.
 */
export class EdgeBuilder {
  private readonly segments: Segment[] = [];
  private readonly visited = new Set<string>();

  private constructor(
    private readonly adj: ReadonlyMap<string, Set<string>>,
    private readonly grid: ReadonlyMap<string, HexCell>,
  ) { }

  static from(
    adj: ReadonlyMap<string, Set<string>>,
    grid: ReadonlyMap<string, HexCell>,
  ): EdgeBuilder {
    const eb = new EdgeBuilder(adj, grid);
    for (const cell of grid.values()) {
      if (!isPathCell(cell)) continue;
      const startKey = coordKey(cell.coord);
      if (!eb.visited.has(startKey)) {
        eb.segments.push(eb.floodFrom(startKey));
      }
    }
    return eb;
  }

  private floodFrom(seed: string): Segment {
    const segment: Segment = { cells: new Set(), borders: new Map() };
    const stack: string[] = [seed];
    this.visited.add(seed);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      segment.cells.add(cur);
      for (const nk of this.adj.get(cur)!) {
        const n = this.grid.get(nk)!;
        if (n.kind === 'territory') {
          let s = segment.borders.get(n.id);
          if (!s) {
            s = new Set();
            segment.borders.set(n.id, s);
          }
          s.add(cur);
        } else if (!this.visited.has(nk)) {
          this.visited.add(nk);
          stack.push(nk);
        }
      }
    }
    return segment;
  }

  /** BFS over a segment's cells seeded from the path cells bordering `territoryId`. Yields coords T-side → far-side. */
  private orderedPathFrom(segment: Segment, territoryId: ID): HexCoord[] {
    const order: HexCoord[] = [];
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const s of segment.borders.get(territoryId) ?? []) {
      if (!seen.has(s) && segment.cells.has(s)) {
        seen.add(s);
        queue.push(s);
      }
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      order.push(this.grid.get(cur)!.coord);
      for (const nk of this.adj.get(cur)!) {
        if (!seen.has(nk) && segment.cells.has(nk)) {
          seen.add(nk);
          queue.push(nk);
        }
      }
    }
    return order;
  }

  /** One HexEdge per canonical (T_A, T_B) pair across all segments. Same-pair edges from disjoint segments are merged. */
  toEdges(): HexEdge[] {
    const edgeByPair = new Map<string, HexEdge>();
    for (const segment of this.segments) {
      const tIds = [...segment.borders.keys()];
      for (let i = 0; i < tIds.length; i++) {
        for (let j = i + 1; j < tIds.length; j++) {
          const [tA, tB] = canonicalTerritoryPair(tIds[i], tIds[j]);
          const ordered = this.orderedPathFrom(segment, tA);
          const key = pairKey(tA, tB);
          const existing = edgeByPair.get(key);
          if (existing) {
            // TODO: cross-segment concatenation is "visually approximate" — see README.
            existing.pathCoords.push(...ordered);
          } else {
            edgeByPair.set(key, {
              id: edgeIdFor(tA, tB),
              territoryA: tA,
              territoryB: tB,
              pathCoords: ordered,
            });
          }
        }
      }
    }
    return [...edgeByPair.values()];
  }
}
