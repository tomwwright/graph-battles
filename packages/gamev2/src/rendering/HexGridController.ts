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
import type { HoverInfo } from '../state/types';

type TileOverlay = { color: Color3; alpha: number };

type TerritoryClickCallback = (territoryId: ID) => void;
type HoverCallback = (hover: HoverInfo) => void;

/**
 * Creates tile-level hex meshes for hit detection and overlay display.
 * Maps tile clicks/hovers to territory IDs or edge info.
 * Highlights all 7 tiles of a hovered hex cluster (territory or grass edge).
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
  private hoverCallback: HoverCallback | null = null;
  private overlays = new Map<string, TileOverlay>();

  // Currently hovered hex (either territory or edge grass)
  private hoveredHexKey: string | null = null;
  private hoveredHexCoord: HexCoord | null = null;

  // Maps from hex coord key → territory ID
  private territoryLookup = new Map<string, ID>();
  // Maps from territory ID → hex coord
  private territoryCoords = new Map<ID, HexCoord>();
  // Maps from grass hex coord key → edge info (connected territories)
  private edgeLookup = new Map<string, { territoryA: ID; territoryB: ID }>();

  constructor(private readonly scene: Scene) {}

  onTerritoryClick(callback: TerritoryClickCallback): void {
    this.clickCallback = callback;
  }

  onHover(callback: HoverCallback): void {
    this.hoverCallback = callback;
  }

  /**
   * Register territory and edge hex coordinates for click/hover resolution.
   */
  setTerritoryMap(
    territories: { id: ID; coord: HexCoord }[],
    edges: { territoryA: ID; territoryB: ID; grassCoord: HexCoord }[]
  ): void {
    this.territoryLookup.clear();
    this.territoryCoords.clear();
    this.edgeLookup.clear();

    for (const t of territories) {
      this.territoryLookup.set(coordKey(t.coord), t.id);
      this.territoryCoords.set(t.id, t.coord);
    }

    for (const e of edges) {
      const key = coordKey(e.grassCoord);
      this.edgeLookup.set(key, { territoryA: e.territoryA, territoryB: e.territoryB });
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

  private setHexHighlight(hexCoord: HexCoord, color: Color3, alpha: number): void {
    const tiles = hexToTileCoords(hexCoord);
    for (const tile of tiles) {
      if (tile.x >= 0 && tile.x < this.mapSize && tile.z >= 0 && tile.z < this.mapSize) {
        this.setColorAndAlpha(tile.x, tile.z, color, alpha);
      }
    }
  }

  private unsetHexHighlight(hexCoord: HexCoord): void {
    const tiles = hexToTileCoords(hexCoord);
    for (const tile of tiles) {
      if (tile.x >= 0 && tile.x < this.mapSize && tile.z >= 0 && tile.z < this.mapSize) {
        this.restoreAtPosition(tile.x, tile.z);
      }
    }
  }

  private clearCurrentHover(): void {
    if (this.hoveredHexCoord) {
      this.unsetHexHighlight(this.hoveredHexCoord);
    }
    this.hoveredHexKey = null;
    this.hoveredHexCoord = null;
  }

  private makePointerHandlers(tileCoord: OffsetCoord) {
    const territoryHighlightColor = new Color3(0.5, 0.8, 1.0);
    const edgeHighlightColor = new Color3(0.8, 0.7, 0.3);
    const highlightAlpha = 0.08;

    return {
      onPointerOver: () => {
        const hex = tileToHex(tileCoord);
        const hexKey = coordKey(hex);

        if (hexKey === this.hoveredHexKey) return;

        this.clearCurrentHover();

        const territoryId = this.territoryLookup.get(hexKey);
        if (territoryId) {
          this.hoveredHexKey = hexKey;
          this.hoveredHexCoord = hex;
          this.setHexHighlight(hex, territoryHighlightColor, highlightAlpha);
          this.hoverCallback?.({ type: 'territory', territoryId, hexCoord: hex });
          return;
        }

        const edge = this.edgeLookup.get(hexKey);
        if (edge) {
          this.hoveredHexKey = hexKey;
          this.hoveredHexCoord = hex;
          this.setHexHighlight(hex, edgeHighlightColor, highlightAlpha);
          this.hoverCallback?.({ type: 'edge', ...edge, hexCoord: hex });
          return;
        }

        this.hoverCallback?.(null);
      },
      onPointerOut: () => {
        this.clearCurrentHover();
        this.hoverCallback?.(null);
      },
      onPick: () => {
        const hex = tileToHex(tileCoord);
        const territoryId = this.territoryLookup.get(coordKey(hex));
        if (territoryId) {
          this.clickCallback?.(territoryId);
        }
      },
    };
  }
}
