import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { ID, Values, GameMap } from '@battles/models';
import { hexCenterTile, hexToTileCoords, tileGridSize } from '../map/HexCoordinates';
import { SceneRenderer } from './SceneRenderer';
import { CameraController } from './CameraController';
import { HexGridController } from './HexGridController';
import { AssetLoader } from './AssetLoader';
import { MapRenderer } from './MapRenderer';
import { UnitRenderer } from './UnitRenderer';
import { Navigation } from './Navigation';
import type { HexCellMap } from '../map/HexCellMap';
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

  private map: HexCellMap | null = null;
  private navigation: Navigation | null = null;

  constructor(scene: Scene, camera: ArcRotateCamera, assetLoader: AssetLoader) {
    this.sceneRenderer = new SceneRenderer(scene, camera);
    this.cameraController = new CameraController(camera);
    this.grid = new HexGridController(scene);
    this.assetLoader = assetLoader;
    this.mapRenderer = new MapRenderer(scene, this.grid, this.assetLoader);
    this.unitRenderer = new UnitRenderer(scene, this.assetLoader);
    this.unitRenderer.onMeshRegistration((mesh) => this.sceneRenderer.registerMeshes([mesh]));
  }

  // --- Lifecycle ---

  async initialise(map: HexCellMap, gameMap: GameMap): Promise<void> {
    this.map = map;
    this.navigation = new Navigation(map, this.grid);

    this.unitRenderer.initialise(this.navigation);

    await this.assetLoader.loadAll();

    const territories = map.territories();
    const pathCells = map.pathCells();
    const rows = Math.max(...territories.map((t) => t.coord.x), ...pathCells.map((p) => p.coord.x)) + 1;
    const cols = Math.max(...territories.map((t) => t.coord.z), ...pathCells.map((p) => p.coord.z)) + 1;
    const gridSize = tileGridSize(rows, cols);
    this.grid.setSize(gridSize);

    this.grid.setMap(map);

    const meshes = this.mapRenderer.loadMap(territories, pathCells, gameMap);

    this.sceneRenderer.registerMeshes(meshes);

    const sceneSize =
      (Math.max(this.grid.maxX, this.grid.maxZ) + this.cameraController.maxVisibleSurroundingDistance) * 2;
    this.sceneRenderer.resize(sceneSize, this.grid.maxX / 2, this.grid.maxZ / 2);

    const bounds = this.grid.getBounds();
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
    this.unitRenderer.onHover(callback);
  }

  // --- Camera ---

  async focusOn(id: ID): Promise<void> {
    // Unit ids resolve to the unit's tracked location via UnitRenderer;
    // territory/edge ids resolve directly through Navigation.
    const locationId = this.unitRenderer.getUnitLocation(id) ?? id;
    const worldPos = this.navigation!.locationCenter(locationId);
    if (!worldPos) throw new Error(`Unable to resolve id for focusOn: ${locationId}`);
    await this.cameraController.focusOn(worldPos);
  }

  // --- Map rendering ---

  updateTerritoryOverlay(territoryId: ID, color: Color3 | null, alpha: number = 0.12): void {
    const coord = this.map?.territoryCoord(territoryId);
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
   * Highlight path cells of the edge connecting two territories.
   * Used to visualise movement paths when units are selected.
   */
  highlightWaypoints(territoryA: ID, territoryB: ID, color: Color3, alpha: number = 0.15): void {
    const edge = this.map?.edgeBetween(territoryA, territoryB);
    if (!edge) return;

    for (const pathCoord of edge.pathCoords) {
      const tiles = hexToTileCoords(pathCoord);
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
    const coord = this.map?.territoryCoord(territoryId);
    if (!coord) return;

    const newMeshes = this.mapRenderer.updateTerritory(territoryId, coord, prevProperties, nextProperties);
    if (newMeshes.length > 0) {
      this.sceneRenderer.registerMeshes(newMeshes);
    }
  }

  getTerritoryWorldPos(id: ID): Vector3 | null {
    const coord = this.map?.territoryCoord(id);
    if (!coord) return null;
    return this.grid.getWorldPosition(hexCenterTile(coord));
  }

  // --- Unit rendering ---

  getUnitRenderer(): UnitRenderer {
    return this.unitRenderer;
  }

  async animateUnitMove(unitId: ID, fromLocationId: ID, toLocationId: ID, signal?: AbortSignal): Promise<void> {
    await this.unitRenderer.animateUnitMove(unitId, fromLocationId, toLocationId, signal);
  }
}
