import { Values } from '@battles/models';

export type TileType = 'empty' | 'grass' | 'forest' | 'village' | 'farm' | 'sheep' | 'rocks' | 'city' | 'castle' | 'mill';

const CLOSED_DIR_TO_DROPPED_TILES: Record<1 | 2 | 3 | 4 | 5 | 6, [number, number]> = {
  1: [5, 6],
  2: [0, 1],
  3: [4, 6],
  4: [0, 2],
  5: [2, 5],
  6: [1, 4],
};

const { TerritoryProperty } = Values;

function has(props: Values.TerritoryProperty[], prop: Values.TerritoryProperty): boolean {
  return props.includes(prop);
}

/**
 * Computes the 7 tile types for a hex cluster based on territory properties.
 * Index 3 is the center tile; indices 0-2, 4-6 are the surrounding tiles.
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

    // Determine surrounding tiles
    const surround: TileType[] = ['grass', 'grass', 'grass', 'grass', 'grass', 'grass'];

    if (hasFarm) {
      surround[1] = 'farm';
      surround[4] = 'farm';
    }

    if (hasCity) {
      surround[1] = 'mill';
      surround[2] = 'village'
      surround[5] = 'sheep';
    }

    if (hasFort && (hasCity || hasCastle)) {
      surround[0] = 'castle';
    }

    if (!hasFarm && !hasFort && !hasCity && !hasCastle) {
      // Just SETTLED — add some forest
      surround[0] = 'forest';
      surround[5] = 'forest';
    }

    return [surround[0], surround[1], surround[2], center, surround[3], surround[4], surround[5]];
  }

  static composGrass(): TileType[] {
    return ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
  }

  static composePath(exclude: 1 | 2 | 3 | 4 | 5 | 6): TileType[] {
    const tiles: TileType[] = ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
    const [a, b] = CLOSED_DIR_TO_DROPPED_TILES[exclude];
    tiles[a] = 'empty';
    tiles[b] = 'empty';
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
