import { ID } from '@battles/models';
import { HexCoord, coordKey } from '../rendering/HexCoordinates';

export type ParsedMap = {
  territories: { id: ID; coord: HexCoord }[];
  grassCells: HexCoord[];
  edges: { territoryA: ID; territoryB: ID; grassCoords: HexCoord[] }[];
};

/**
 * Parses a text grid map into a ParsedMap.
 *
 * Format:
 * - `T` = territory
 * - `g` = grass (filler, also used for edge derivation)
 * - `_` = empty
 *
 * Edges are derived from adjacency: two territories share an edge if they
 * are both adjacent to the same grass cell.
 */
export function parseMap(mapString: string): ParsedMap {
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
  const territories: ParsedMap['territories'] = [];
  const grassCells: HexCoord[] = [];
  let nextTerritoryId = 1;

  // Map from coord key to territory ID for adjacency lookup
  const territoryAt = new Map<string, ID>();

  for (let x = 0; x < rows; x++) {
    for (let z = 0; z < cols; z++) {
      const cell = grid[x][z];
      const coord: HexCoord = { x, z };

      if (cell === 'T') {
        const id = `#${nextTerritoryId++}`;
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
  const edges: ParsedMap['edges'] = [];
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
        const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ territoryA: a, territoryB: b, grassCoords: component });
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
