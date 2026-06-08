import { Values } from '@battles/models';

export type TileType = 'empty' | 'grass' | 'forest' | 'village' | 'farm' | 'sheep' | 'rocks' | 'city' | 'castle' | 'mill';

// Drop tile D and its CW-next tile (D%6+1) for closed direction D
const CLOSED_DIR_TO_DROPPED_TILES: Record<1 | 2 | 3 | 4 | 5 | 6, [number, number]> = {
  1: [1, 2],
  2: [2, 3],
  3: [3, 4],
  4: [4, 5],
  5: [5, 6],
  6: [6, 1],
};

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

  static presentTileIndices(exclude: 1 | 2 | 3 | 4 | 5 | 6): number[] {
    const dropped = new Set(CLOSED_DIR_TO_DROPPED_TILES[exclude]);
    return [0, 1, 2, 3, 4, 5, 6].filter((i) => !dropped.has(i));
  }

  static presentNarrowTileIndices(dirA: 1 | 2 | 3 | 4 | 5 | 6, dirB: 1 | 2 | 3 | 4 | 5 | 6): number[] {
    return [0, dirA, dirB];
  }

  static composePath(exclude: 1 | 2 | 3 | 4 | 5 | 6): TileType[] {
    const tiles: TileType[] = ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'];
    const [a, b] = CLOSED_DIR_TO_DROPPED_TILES[exclude];
    tiles[a] = 'empty';
    tiles[b] = 'empty';
    return tiles;
  }

  static composeNarrowPath(dirA: 1 | 2 | 3 | 4 | 5 | 6, dirB: 1 | 2 | 3 | 4 | 5 | 6): TileType[] {
    const tiles: TileType[] = Array(7).fill('empty') as TileType[];
    for (const i of TerritoryComposition.presentNarrowTileIndices(dirA, dirB)) {
      tiles[i] = 'grass';
    }
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
