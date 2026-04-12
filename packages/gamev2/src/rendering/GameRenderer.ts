import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { ID, Values, GameMap } from '@battles/models';
import { HexCoord, hexCenterTile, hexToTileCoords, tileGridSize } from './HexCoordinates';
import { SceneRenderer } from './SceneRenderer';
import { CameraController } from './CameraController';
import { HexGridController } from './HexGridController';
import { AssetLoader } from './AssetLoader';
import { MapRenderer } from './MapRenderer';
import { UnitRenderer } from './UnitRenderer';
import { RenderMap } from '../map/MapParser';
import type { HoverInfo } from '../state/types';

type TerritoryClickCallback = (territoryId: ID) => void;
type UnitClickCallback = (unitId: ID) => void;
type HoverCallback = (hover: HoverInfo) => void;

/**
 * Facade for the rendering layer. Only rendering interface the orchestrator uses.
 * Delegates to internal renderer classes.
 */
export class GameRenderer {
  private readonly sceneRenderer: SceneRenderer;
  private readonly cameraController: CameraController;
  private readonly grid: HexGridController;
  private readonly assetLoader: AssetLoader;
  private readonly mapRenderer: MapRenderer;
  private readonly unitRenderer: UnitRenderer;

  private map: RenderMap | null = null;
  // territory ID → hex coord, for camera focus
  private territoryCoordMap = new Map<ID, HexCoord>();

  constructor(scene: Scene, camera: ArcRotateCamera) {
    this.sceneRenderer = new SceneRenderer(scene, camera);
    this.cameraController = new CameraController(camera);
    this.grid = new HexGridController(scene);
    this.assetLoader = new AssetLoader(scene);
    this.mapRenderer = new MapRenderer(scene, this.grid, this.assetLoader);
    this.unitRenderer = new UnitRenderer(scene, this.grid, this.territoryCoordMap);
    this.unitRenderer.onMeshRegistration((mesh) => this.sceneRenderer.registerMeshes([mesh]));
  }

  // --- Lifecycle ---

  async initialise(renderMap: RenderMap, gameMap: GameMap): Promise<void> {
    this.map = renderMap;

    // Build territory coord lookup
    this.territoryCoordMap.clear();
    for (const t of renderMap.territories) {
      this.territoryCoordMap.set(t.id, t.coord);
    }

    this.unitRenderer.initialise(renderMap, gameMap);

    // Load GLB assets
    await this.assetLoader.loadAll();

    // Size the tile grid
    const rows = Math.max(...renderMap.territories.map((t) => t.coord.x), ...renderMap.grassCells.map((g) => g.x)) + 1;
    const cols = Math.max(...renderMap.territories.map((t) => t.coord.z), ...renderMap.grassCells.map((g) => g.z)) + 1;
    const gridSize = tileGridSize(rows, cols);
    this.grid.setSize(gridSize);

    // Register territory and edge map for click/hover resolution
    this.grid.setTerritoryMap(renderMap.territories, renderMap.edges);

    // Place tile meshes
    const meshes = this.mapRenderer.loadMap(renderMap.territories, renderMap.grassCells, gameMap);

    // Register meshes for shadows and reflections
    this.sceneRenderer.registerMeshes(meshes);

    // Size skybox/ground to extend beyond what the camera can see at max zoom
    const sceneSize =
      (Math.max(this.grid.maxX, this.grid.maxZ) + this.cameraController.maxVisibleSurroundingDistance) * 2;
    this.sceneRenderer.resize(sceneSize, this.grid.maxX / 2, this.grid.maxZ / 2);

    // Set camera bounds and center based on territory bounds
    const bounds = this.grid.getBounds();

    console.log('Bounds', bounds);
    console.log('Grid', this.grid.maxX, this.grid.maxZ);

    this.cameraController.setBounds(bounds.maximum.x, bounds.maximum.z);
    this.cameraController.centerCamera();
  }

  dispose(): void {
    this.mapRenderer.dispose();
    this.grid.dispose();
    this.unitRenderer.dispose();
  }

  // --- Input callbacks ---

  onTerritoryClick(callback: TerritoryClickCallback): void {
    this.grid.onTerritoryClick(callback);
  }

  onUnitClick(callback: UnitClickCallback): void {
    this.unitRenderer.onUnitClick(callback);
  }

  onHover(callback: HoverCallback): void {
    this.grid.onHover(callback);
  }

  // --- Camera ---

  async focusOn(territoryId: ID): Promise<void> {
    const coord = this.territoryCoordMap.get(territoryId);
    if (!coord) return;
    const centerTile = hexCenterTile(coord);
    const worldPos = this.grid.getWorldPosition(centerTile);
    await this.cameraController.focusOn(worldPos);
  }

  // --- Map rendering ---

  updateTerritoryOverlay(territoryId: ID, color: Color3 | null, alpha: number = 0.12): void {
    const coord = this.territoryCoordMap.get(territoryId);
    if (!coord) return;

    const tiles = hexToTileCoords(coord);
    for (const tile of tiles) {
      if (color) {
        this.grid.setTileOverlay(tile, color, alpha);
      } else {
        this.grid.setTileOverlay(tile, Color3.Black(), 0);
      }
    }
  }

  /**
   * Highlight grass cells of the edge connecting two territories.
   * Used to visualise movement paths when units are selected.
   */
  highlightWaypoints(territoryA: ID, territoryB: ID, color: Color3, alpha: number = 0.15): void {
    if (!this.map) return;
    const edge = this.map.edges.find(
      (e) =>
        (e.territoryA === territoryA && e.territoryB === territoryB) ||
        (e.territoryA === territoryB && e.territoryB === territoryA)
    );
    if (!edge) return;

    for (const grassCoord of edge.grassCoords) {
      const tiles = hexToTileCoords(grassCoord);
      for (const tile of tiles) {
        this.grid.setTileOverlay(tile, color, alpha);
      }
    }
  }

  clearOverlays(): void {
    this.grid.clearAllOverlays();
  }

  updateTerritoryComposition(
    territoryId: ID,
    prevProperties: Values.TerritoryProperty[],
    nextProperties: Values.TerritoryProperty[]
  ): void {
    const coord = this.territoryCoordMap.get(territoryId);
    if (!coord) return;

    const newMeshes = this.mapRenderer.updateTerritory(territoryId, coord, prevProperties, nextProperties);
    if (newMeshes.length > 0) {
      this.sceneRenderer.registerMeshes(newMeshes);
    }
  }

  // --- Unit rendering ---

  getUnitRenderer(): UnitRenderer {
    return this.unitRenderer;
  }

  async animateUnitMove(unitId: ID, fromLocationId: ID, toLocationId: ID, signal?: AbortSignal): Promise<void> {
    await this.unitRenderer.animateUnitMove(unitId, fromLocationId, toLocationId, signal);
  }
}
