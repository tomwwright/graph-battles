import {
  ActionManager,
  Color3,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { ID } from '@battles/models';
import { HexCoord, OffsetCoord, hexToTileCoords, tileToHex, coordKey } from './HexCoordinates';

type TileOverlay = { color: Color3; alpha: number };

type TerritoryClickCallback = (territoryId: ID) => void;
type TerritoryHoverCallback = (territoryId: ID | null) => void;

/**
 * Creates tile-level hex meshes for hit detection and overlay display.
 * Maps tile clicks/hovers to territory IDs. Highlights all 7 tiles of
 * a hovered territory's hex cluster rather than row/column cross.
 */
export class HexGridController {
  grid: Mesh[][] = [];

  readonly radius = 1;
  readonly spacing = 1.01;
  readonly spacingX = this.radius * this.spacing * 1.5;
  readonly spacingZ = this.radius * this.spacing * Math.sqrt(3);
  maxX = 0;
  maxZ = 0;

  private mapSize = 0;
  private clickCallback: TerritoryClickCallback | null = null;
  private hoverCallback: TerritoryHoverCallback | null = null;
  private overlays = new Map<string, TileOverlay>();
  private hoveredTerritoryId: ID | null = null;

  // Maps from hex coord key → territory ID (set during map load)
  private territoryLookup = new Map<string, ID>();
  // Maps from territory ID → hex coord (for hover highlight)
  private territoryCoords = new Map<ID, HexCoord>();

  constructor(private readonly scene: Scene) {}

  onTerritoryClick(callback: TerritoryClickCallback): void {
    this.clickCallback = callback;
  }

  onTerritoryHover(callback: TerritoryHoverCallback): void {
    this.hoverCallback = callback;
  }

  /**
   * Register the territory hex coordinates so we can map tile clicks to territory IDs
   * and highlight territory clusters on hover.
   */
  setTerritoryMap(territories: { id: ID; coord: HexCoord }[]): void {
    this.territoryLookup.clear();
    this.territoryCoords.clear();
    for (const t of territories) {
      this.territoryLookup.set(coordKey(t.coord), t.id);
      this.territoryCoords.set(t.id, t.coord);
    }
  }

  setSize(size: number): void {
    this.dispose();
    this.mapSize = size;
    this.maxX = size * this.spacingX;
    this.maxZ = size * this.spacingZ;
    if (size > 0) {
      this.createGrid();
    }
  }

  getWorldPosition(coord: OffsetCoord): Vector3 {
    const hexagon = this.grid[coord.x]?.[coord.z];
    if (!hexagon) {
      const offsetZ = (coord.x % 2) * this.spacingZ * 0.5;
      return new Vector3(coord.x * this.spacingX, 0.5, coord.z * this.spacingZ + offsetZ);
    }
    return hexagon.position.clone();
  }

  setTileOverlay(coord: OffsetCoord, color: Color3, alpha: number): void {
    const key = `${coord.x},${coord.z}`;
    this.overlays.set(key, { color, alpha });
    this.setColorAndAlpha(coord.x, coord.z, color, alpha);
  }

  clearAllOverlays(): void {
    for (const [key] of this.overlays) {
      const [xStr, zStr] = key.split(',');
      const x = parseInt(xStr);
      const z = parseInt(zStr);
      if (x >= 0 && x < this.mapSize && z >= 0 && z < this.mapSize) {
        this.setColorAndAlpha(x, z, Color3.Black(), 0);
      }
    }
    this.overlays.clear();
  }

  dispose(): void {
    this.overlays.clear();
    for (const row of this.grid) {
      for (const cell of row) {
        cell.dispose();
      }
    }
    this.grid = [];
  }

  private createGrid(): void {
    const { radius, spacingX, spacingZ, mapSize } = this;

    const template = MeshBuilder.CreateCylinder(
      'hexagon',
      { tessellation: 6, height: 1, diameter: radius * 2 },
      this.scene
    );
    const hexagonMaterial = new StandardMaterial('hexagon', this.scene);
    hexagonMaterial.specularColor = Color3.Black();
    hexagonMaterial.diffuseColor = Color3.Black();
    hexagonMaterial.alpha = 0;

    this.grid = [];

    for (let x = 0; x < mapSize; x++) {
      const row: Mesh[] = [];
      this.grid.push(row);
      for (let z = 0; z < mapSize; z++) {
        const hexagon = template.clone(`hex-${x}-${z}`);
        hexagon.material = hexagonMaterial.clone(`hexmat-${x}-${z}`);
        const offsetZ = (x % 2) * spacingZ * 0.5;
        hexagon.position = new Vector3(x * spacingX, 0.5, z * spacingZ + offsetZ);

        hexagon.actionManager = new ActionManager(this.scene);

        const tileCoord: OffsetCoord = { x, z };
        const handlers = this.makePointerHandlers(tileCoord);

        hexagon.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, handlers.onPointerOver)
        );
        hexagon.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, handlers.onPointerOut)
        );
        hexagon.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, handlers.onPick)
        );

        row.push(hexagon);
      }
    }

    template.dispose();
  }

  private setColorAndAlpha(x: number, z: number, color: Color3, alpha: number): void {
    const mesh = this.grid[x]?.[z];
    if (!mesh) return;
    const material = mesh.material as StandardMaterial;
    material.alpha = alpha;
    material.diffuseColor = color;
  }

  private restoreAtPosition(x: number, z: number): void {
    const overlay = this.overlays.get(`${x},${z}`);
    if (overlay) {
      this.setColorAndAlpha(x, z, overlay.color, overlay.alpha);
    } else {
      this.setColorAndAlpha(x, z, Color3.Black(), 0);
    }
  }

  private getTerritoryIdForTile(tile: OffsetCoord): ID | null {
    const hex = tileToHex(tile);
    return this.territoryLookup.get(coordKey(hex)) ?? null;
  }

  private makePointerHandlers(tileCoord: OffsetCoord) {
    const highlightColor = new Color3(0.5, 0.8, 1.0);
    const highlightAlpha = 0.08;

    const setTerritoryHighlight = (territoryId: ID) => {
      const hexCoord = this.territoryCoords.get(territoryId);
      if (!hexCoord) return;
      const tiles = hexToTileCoords(hexCoord);
      for (const tile of tiles) {
        if (tile.x >= 0 && tile.x < this.mapSize && tile.z >= 0 && tile.z < this.mapSize) {
          this.setColorAndAlpha(tile.x, tile.z, highlightColor, highlightAlpha);
        }
      }
    };

    const unsetTerritoryHighlight = (territoryId: ID) => {
      const hexCoord = this.territoryCoords.get(territoryId);
      if (!hexCoord) return;
      const tiles = hexToTileCoords(hexCoord);
      for (const tile of tiles) {
        if (tile.x >= 0 && tile.x < this.mapSize && tile.z >= 0 && tile.z < this.mapSize) {
          this.restoreAtPosition(tile.x, tile.z);
        }
      }
    };

    return {
      onPointerOver: () => {
        const territoryId = this.getTerritoryIdForTile(tileCoord);
        if (territoryId && territoryId !== this.hoveredTerritoryId) {
          if (this.hoveredTerritoryId) {
            unsetTerritoryHighlight(this.hoveredTerritoryId);
          }
          this.hoveredTerritoryId = territoryId;
          setTerritoryHighlight(territoryId);
          this.hoverCallback?.(territoryId);
        } else if (!territoryId && this.hoveredTerritoryId) {
          unsetTerritoryHighlight(this.hoveredTerritoryId);
          this.hoveredTerritoryId = null;
          this.hoverCallback?.(null);
        }
      },
      onPointerOut: () => {
        if (this.hoveredTerritoryId) {
          unsetTerritoryHighlight(this.hoveredTerritoryId);
          this.hoveredTerritoryId = null;
          this.hoverCallback?.(null);
        }
      },
      onPick: () => {
        const territoryId = this.getTerritoryIdForTile(tileCoord);
        if (territoryId) {
          this.clickCallback?.(territoryId);
        }
      },
    };
  }
}
