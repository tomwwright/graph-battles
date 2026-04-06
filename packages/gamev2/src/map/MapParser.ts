import { ID } from '@battles/models';
import { HexCoord, coordKey } from '../rendering/HexCoordinates';

export type ParsedMap = {
  territories: { id: ID; coord: HexCoord }[];
  grassCells: HexCoord[];
  edges: { territoryA: ID; territoryB: ID; grassCoord: HexCoord }[];
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

  // Derive edges: for each grass cell, find adjacent territory cells.
  // Hex adjacency in odd-q offset: depends on column parity.
  const edges: ParsedMap['edges'] = [];
  const edgeSet = new Set<string>();

  for (const grass of grassCells) {
    const adjacentTerritoryIds: ID[] = [];

    for (const neighbour of hexNeighbours(grass)) {
      const key = coordKey(neighbour);
      const tId = territoryAt.get(key);
      if (tId) {
        adjacentTerritoryIds.push(tId);
      }
    }

    // Every pair of adjacent territories gets an edge via this grass cell
    for (let i = 0; i < adjacentTerritoryIds.length; i++) {
      for (let j = i + 1; j < adjacentTerritoryIds.length; j++) {
        const a = adjacentTerritoryIds[i];
        const b = adjacentTerritoryIds[j];
        const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ territoryA: a, territoryB: b, grassCoord: grass });
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
