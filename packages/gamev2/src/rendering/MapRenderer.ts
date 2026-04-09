import { AbstractMesh, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { ID, Values, GameMap } from '@battles/models';
import { HexCoord, hexToTileCoords } from './HexCoordinates';
import { TerritoryComposition, TileType } from './TerritoryComposition';
import { AssetLoader } from './AssetLoader';
import { HexGridController } from './HexGridController';

type PlacedTile = {
  mesh: AbstractMesh;
  tileType: TileType;
  tileIndex: number;
};

/**
 * Places tile meshes for each hex cell using coordinate lookups and
 * TerritoryComposition. Supports mesh replacement when territory properties change.
 */
export class MapRenderer {
  private mapNode: TransformNode | null = null;
  // territoryId → array of placed tile meshes
  private territoryTiles = new Map<ID, PlacedTile[]>();
  // all placed meshes (for shadow/mirror registration)
  private allMeshes: AbstractMesh[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly grid: HexGridController,
    private readonly assetLoader: AssetLoader
  ) {}

  /**
   * Render the full map. Returns all placed meshes for shadow/mirror registration.
   */
  loadMap(
    territories: { id: ID; coord: HexCoord }[],
    grassCells: HexCoord[],
    gameMap: GameMap
  ): AbstractMesh[] {
    this.dispose();

    this.mapNode = new TransformNode('map');
    this.scene.addTransformNode(this.mapNode);
    this.allMeshes = [];

    // Place grass cells (always 7 grass tiles)
    for (const grass of grassCells) {
      const tiles = TerritoryComposition.composGrass();
      const tileCoords = hexToTileCoords(grass);
      this.placeTiles(tiles, tileCoords, `grass-${grass.x}-${grass.z}`);
    }

    // Place territory cells
    for (const territory of territories) {
      const properties = gameMap.territory(territory.id)?.data.properties ?? [];
      const tiles = TerritoryComposition.compose(properties);
      const tileCoords = hexToTileCoords(territory.coord);
      const placed = this.placeTiles(tiles, tileCoords, `territory-${territory.id}`);
      this.territoryTiles.set(territory.id, placed);
    }

    return this.allMeshes;
  }

  /**
   * Update a territory's tile meshes after its properties change.
   * Only replaces tiles that differ.
   */
  updateTerritory(
    territoryId: ID,
    coord: HexCoord,
    prevProperties: Values.TerritoryProperty[],
    nextProperties: Values.TerritoryProperty[]
  ): AbstractMesh[] {
    const changes = TerritoryComposition.diff(prevProperties, nextProperties);
    if (changes.length === 0) return [];

    const existing = this.territoryTiles.get(territoryId) ?? [];
    const tileCoords = hexToTileCoords(coord);
    const newMeshes: AbstractMesh[] = [];

    for (const change of changes) {
      // Remove old tile mesh at this index
      const old = existing.find((t) => t.tileIndex === change.index);
      if (old) {
        old.mesh.dispose();
        this.allMeshes = this.allMeshes.filter((m) => m !== old.mesh);
      }

      // Place new tile
      const tc = tileCoords[change.index];
      const mesh = this.placeSingleTile(change.tile, tc, `territory-${territoryId}-${change.index}`);
      if (mesh) {
        newMeshes.push(mesh);
        // Update the placed tiles record
        const idx = existing.findIndex((t) => t.tileIndex === change.index);
        const entry: PlacedTile = { mesh, tileType: change.tile, tileIndex: change.index };
        if (idx >= 0) existing[idx] = entry;
        else existing.push(entry);
      }
    }

    this.territoryTiles.set(territoryId, existing);
    return newMeshes;
  }

  dispose(): void {
    if (this.mapNode) {
      this.mapNode.dispose();
      this.mapNode = null;
    }
    this.territoryTiles.clear();
    this.allMeshes = [];
  }

  private placeTiles(tiles: TileType[], tileCoords: { x: number; z: number }[], prefix: string): PlacedTile[] {
    const placed: PlacedTile[] = [];

    for (let i = 0; i < tileCoords.length; i++) {
      const tc = tileCoords[i];
      const tileType = tiles[i];
      const mesh = this.placeSingleTile(tileType, tc, `${prefix}-${i}`);
      if (mesh) {
        placed.push({ mesh, tileType, tileIndex: i });
      }
    }

    return placed;
  }

  private placeSingleTile(tileType: TileType, tc: { x: number; z: number }, name: string): AbstractMesh | null {
    if (tc.x < 0 || tc.z < 0) return null;

    const mesh = this.assetLoader.clone(tileType, name);
    if (!mesh) return null;

    mesh.setParent(this.mapNode!);

    const tilePos = this.grid.getWorldPosition(tc);
    mesh.position = new Vector3(tilePos.x, mesh.position.y, tilePos.z);

    this.allMeshes.push(mesh);
    return mesh;
  }
}
