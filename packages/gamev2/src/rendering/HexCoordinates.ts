/**
 * Hex coordinate transforms for the super-hex tile system.
 *
 * Each "hex" on the game map is rendered as a cluster of 7 tiles (center + 6 neighbours).
 * This module converts between hex-level coordinates (used by the game map) and
 * tile-level coordinates (used by the rendering grid).
 *
 * Uses odd-q offset convention for tile grid positions.
 */

export type HexCoord = { x: number; z: number };
export type HexDirection = 1 | 2 | 3 | 4 | 5 | 6;

/** Tile position in the rendered offset grid (odd-q convention) */
export type OffsetCoord = { x: number; z: number };

/** Tile position in axial coordinates (q, r) */
export type AxialCoord = { q: number; r: number };

// -- Coordinate conversion (odd-q offset convention) --

export function offsetToAxial(offset: OffsetCoord): AxialCoord {
  const parity = Math.floor(offset.x / 2);
  return { q: offset.x, r: offset.z - parity };
}

export function axialToOffset(axial: AxialCoord): OffsetCoord {
  const parity = Math.floor(axial.q / 2);
  return { x: axial.q, z: axial.r + parity };
}

// -- Super hex tile offsets --

/**
 * The 7 tile positions within a hex cluster in axial coordinates.
 * Index 0 is center; indices 1-6 face clockwise hex directions:
 *
 *     [1] N
 * [6] W    [2] NE
 *  [5] SW   [3] E
 *      [4] S
 */
const AXIAL_HEX_TILE_OFFSETS: ReadonlyArray<AxialCoord> = [
  { q: 0, r: 0 }, // 0 = center
  { q: -1, r: 0 }, // 1 = N
  { q: -1, r: 1 }, // 2 = NE
  { q: 0, r: 1 }, // 3 = E
  { q: 1, r: 0 }, // 4 = S
  { q: 1, r: -1 }, // 5 = SW
  { q: 0, r: -1 }, // 6 = W
];

export const CENTER_OFFSET_INDEX = 0;

// -- Axial-space hex↔tile transforms --

/**
 * Hex-to-tile centre in axial space via stride vectors.
 *
 * +1 hex.x moves (+3, -1) in tile axial
 * +1 hex.z moves (+1, +2) in tile axial
 */
function hexToTileAxial(hex: HexCoord): AxialCoord {
  const axial: AxialCoord = { q: hex.x, r: hex.z };
  return {
    q: axial.q * 3 + axial.r * 1,
    r: axial.q * -1 + axial.r * 2,
  };
}

/**
 * Tile axial → parent hex by reversing the stride vectors.
 * Since each super hex is 7 tiles (det=7), we divide by 7 and round.
 */
function tileAxialToHex(tile: AxialCoord): HexCoord {
  return {
    x: Math.round((tile.q * 2 - tile.r) / 7),
    z: Math.round((tile.q * 1 + tile.r * 3) / 7),
  };
}

// -- Public API (offset in, offset out) --

export function hexCenterTile(hex: HexCoord): OffsetCoord {
  return axialToOffset(hexToTileAxial(hex));
}

export function hexToTileCoords(hex: HexCoord): OffsetCoord[] {
  const center = hexToTileAxial(hex);
  return AXIAL_HEX_TILE_OFFSETS.map((o) => axialToOffset({ q: center.q + o.q, r: center.r + o.r }));
}

export function tileToHex(tile: OffsetCoord): HexCoord {
  return tileAxialToHex(offsetToAxial(tile));
}

export function tileGridSize(rows: number, columns: number): number {
  return Math.max(rows, columns) * 3;
}

export function coordKey(coord: HexCoord): string {
  return `${coord.x},${coord.z}`;
}

// -- Hex direction geometry --

/** Direction vectors indexed by HexDir - 1 (clockwise from North). */
const HEX_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], // 1: N
  [-1, +1], // 2: NE
  [0, +1], // 3: E
  [+1, 0], // 4: S
  [+1, -1], // 5: SW
  [0, -1], // 6: W
];

export function toOffsetCoordinates(direction: HexDirection) {
  return HEX_DIRS[direction - 1];
}

const HEX_OPPOSITE: Record<HexDirection, HexDirection> = { 1: 4, 4: 1, 2: 5, 5: 2, 3: 6, 6: 3 };

export function toOppositeDirection(direction: HexDirection) {
  return HEX_OPPOSITE[direction];
}

/** Tile at direction D also borders the hex neighbour in the CCW-previous direction. */
export const HEX_DIR_CCW_PREV: Record<HexDirection, HexDirection> = { 1: 6, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

// Tile indices dropped when direction D is closed (tile D and its CW-next D%6+1)
const CLOSED_DIR_DROPPED_TILES: Record<HexDirection, [number, number]> = {
  1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5], 5: [5, 6], 6: [6, 1],
};

/** Tile indices present in a wide path hex cluster with one direction closed. */
export function toPathCellIndices(exclude: HexDirection): number[] {
  const dropped = new Set(CLOSED_DIR_DROPPED_TILES[exclude]);
  return [0, 1, 2, 3, 4, 5, 6].filter((i) => !dropped.has(i));
}

/** Tile indices present in a narrow path hex cluster (center + two arm tiles). */
export function toNarrowPathCellIndices(dirA: HexDirection, dirB: HexDirection): number[] {
  return [0, dirA, dirB];
}

