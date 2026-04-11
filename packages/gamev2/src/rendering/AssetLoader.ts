import { AbstractMesh, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { TileType } from './TerritoryComposition';

const TILE_TYPE_FILES: Partial<Record<TileType, string>> = {
  grass: '/grass.glb',
  forest: '/grass-forest.glb',
  sheep: '/building-sheep.glb',
  farm: '/building-farm.glb',
  castle: '/building-castle.glb',
  village: '/building-village.glb',
  rocks: '/water-rocks.glb',
};

/**
 * Loads and caches GLB models by tile type.
 * Provides mesh instances on demand (cloned from cached originals).
 */
export class AssetLoader {
  private templates = new Map<TileType, AbstractMesh>();

  constructor(private readonly scene: Scene) { }

  async loadAll(): Promise<void> {
    for (const [tileType, filename] of Object.entries(TILE_TYPE_FILES)) {
      if (this.templates.has(tileType as TileType)) continue;

      const imported = await SceneLoader.ImportMeshAsync('', filename, undefined, undefined, undefined, '.glb');
      const mesh = imported.meshes.find((m) => m.name === '__root__');
      if (!mesh) throw new Error(`No __root__ in ${filename}`);

      if (tileType === 'rocks') {
        mesh.position.y -= 0.1;
      }

      mesh.rotate(Vector3.Up(), Math.PI / 6);
      mesh.scalingDeterminant = 1.7;
      mesh.setEnabled(false);

      this.templates.set(tileType as TileType, mesh);
    }
  }

  /**
   * Clone a mesh for the given tile type. Returns null if the tile type
   * has no GLB asset (e.g. fort, city, castle — not yet created).
   */
  clone(tileType: TileType, name: string): AbstractMesh | null {
    const template = this.templates.get(tileType);
    if (!template) return null;

    const clone = template.clone(name, null);
    if (!clone) return null;

    clone.setEnabled(true);

    // Random 60-degree rotation for visual variety
    const rotation = Math.floor(6 * Math.random());
    clone.rotate(Vector3.UpReadOnly, (rotation * Math.PI) / 3);

    return clone;
  }

  hasAsset(tileType: TileType): boolean {
    return this.templates.has(tileType);
  }
}
