import { Values } from '@battles/models';
import { HexDirection, presentTileIndices, presentNarrowTileIndices } from './HexCoordinates';

export type TileType = 'empty' | 'grass' | 'forest' | 'village' | 'farm' | 'sheep' | 'rocks' | 'city' | 'castle' | 'mill';
export type { HexDirection as HexDir };

const { TerritoryProperty } = Values;

function has(props: Values.TerritoryProperty[], prop: Values.TerritoryProperty): boolean {
  return props.includes(prop);
}

/**
 * Computes the 7 tile types for a hex cluster based on territory properties.
 * Index 0 is center; indices 1-6 correspond to clockwise hex directions (1=N, 2=NE, 3=E, 4=S, 5=SW, 6=W).
 */
export class TerritoryComposition {
  static compose(properties: Values.TerritoryProperty[]): TileType[] {
    if (properties.length === 0) {
      return ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
    }

    const hasFarm = has(properties, TerritoryProperty.FARM);
    const hasFort = has(properties, TerritoryProperty.FORT);
    const hasCity = has(properties, TerritoryProperty.CITY);
    const hasCastle = has(properties, TerritoryProperty.CASTLE);

    // Determine center tile (highest-tier building)
    let center: TileType;
    if (hasCastle) center = 'castle';
    else if (hasFort) center = 'castle';
    else if (hasCity) center = 'city';
    else center = 'village';

    const surround = new Array(7).fill('grass') as TileType[];

    if (hasFarm) {
      surround[2] = 'farm'; // NE
      surround[5] = 'farm'; // SW
    }

    if (hasCity) {
      surround[2] = 'mill';    // NE
      surround[6] = 'village'; // W
      surround[4] = 'sheep';   // S
    }

    if (hasFort && (hasCity || hasCastle)) {
      surround[1] = 'castle'; // N
    }

    if (!hasFarm && !hasFort && !hasCity && !hasCastle) {
      surround[1] = 'forest'; // N
      surround[4] = 'forest'; // S
    }

    return [center, surround[1], surround[2], surround[3], surround[4], surround[5], surround[6]];
  }

  static composeGrass(): TileType[] {
    return ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
  }

  static composePath(exclude: HexDirection): TileType[] {
    const tiles: TileType[] = Array(7).fill('empty') as TileType[];
    for (const i of presentTileIndices(exclude)) tiles[i] = 'grass';
    return tiles;
  }

  static composeNarrowPath(dirA: HexDirection, dirB: HexDirection): TileType[] {
    const tiles: TileType[] = Array(7).fill('empty') as TileType[];
    for (const i of presentNarrowTileIndices(dirA, dirB)) tiles[i] = 'grass';
    return tiles;
  }

  static diff(
    prev: Values.TerritoryProperty[],
    next: Values.TerritoryProperty[]
  ): { index: number; tile: TileType }[] {
    const prevTiles = TerritoryComposition.compose(prev);
    const nextTiles = TerritoryComposition.compose(next);
    const changes: { index: number; tile: TileType }[] = [];

    for (let i = 0; i < 7; i++) {
      if (prevTiles[i] !== nextTiles[i]) {
        changes.push({ index: i, tile: nextTiles[i] });
      }
    }

    return changes;
  }
}
