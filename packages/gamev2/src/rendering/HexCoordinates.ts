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
 * The 7 tile positions within a hex cluster in axial coordinates:
 * center + 6 neighbours.
 *
 *     (-1, 0) (-1,+1)
 * ( 0,-1) ( 0, 0) ( 0,+1)
 *     (+1,-1) (+1, 0)
 */
const AXIAL_HEX_TILE_OFFSETS: ReadonlyArray<AxialCoord> = [
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: -1 },
  { q: 0, r: 0 }, // center
  { q: 0, r: 1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
];

export const CENTER_OFFSET_INDEX = 3;

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
