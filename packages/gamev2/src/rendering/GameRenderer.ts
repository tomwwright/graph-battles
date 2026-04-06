import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { ID, Values } from '@battles/models';
import { HexCoord, hexCenterTile, hexToTileCoords, tileGridSize } from './HexCoordinates';
import { SceneRenderer } from './SceneRenderer';
import { CameraController } from './CameraController';
import { HexGridController } from './HexGridController';
import { AssetLoader } from './AssetLoader';
import { MapRenderer } from './MapRenderer';
import { ParsedMap } from '../map/MapParser';
import type { HoverInfo } from '../state/types';

type TerritoryClickCallback = (territoryId: ID) => void;
type HoverCallback = (hover: HoverInfo) => void;

/**
 * Facade for the rendering layer. Only rendering interface the orchestrator uses.
 * Delegates to internal renderer classes.
 */
export class GameRenderer {
  private readonly sceneRenderer: SceneRenderer;
  private readonly cameraController: CameraController;
  readonly grid: HexGridController;
  private readonly assetLoader: AssetLoader;
  private readonly mapRenderer: MapRenderer;

  private parsedMap: ParsedMap | null = null;
  // territory ID → hex coord, for camera focus
  private territoryCoordMap = new Map<ID, HexCoord>();

  constructor(scene: Scene, camera: ArcRotateCamera) {
    this.sceneRenderer = new SceneRenderer(scene, camera);
    this.cameraController = new CameraController(camera);
    this.grid = new HexGridController(scene);
    this.assetLoader = new AssetLoader(scene);
    this.mapRenderer = new MapRenderer(scene, this.grid, this.assetLoader);
  }

  // --- Lifecycle ---

  async initialise(
    parsedMap: ParsedMap,
    territoryProperties: Map<ID, Values.TerritoryProperty[]>
  ): Promise<void> {
    this.parsedMap = parsedMap;

    // Build territory coord lookup
    this.territoryCoordMap.clear();
    for (const t of parsedMap.territories) {
      this.territoryCoordMap.set(t.id, t.coord);
    }

    // Load GLB assets
    await this.assetLoader.loadAll();

    // Size the tile grid
    const rows = Math.max(...parsedMap.territories.map((t) => t.coord.x), ...parsedMap.grassCells.map((g) => g.x)) + 1;
    const cols = Math.max(...parsedMap.territories.map((t) => t.coord.z), ...parsedMap.grassCells.map((g) => g.z)) + 1;
    const gridSize = tileGridSize(rows, cols);
    this.grid.setSize(gridSize);

    // Register territory and edge map for click/hover resolution
    this.grid.setTerritoryMap(parsedMap.territories, parsedMap.edges);

    // Place tile meshes
    const territories = parsedMap.territories.map((t) => ({
      ...t,
      properties: territoryProperties.get(t.id) ?? [],
    }));
    const meshes = this.mapRenderer.loadMap(territories, parsedMap.grassCells);

    // Register meshes for shadows and reflections
    this.sceneRenderer.registerMeshes(meshes);

    // Size skybox/ground to extend beyond what the camera can see at max zoom
    const sceneSize =
      (Math.max(this.grid.maxX, this.grid.maxZ) + this.cameraController.maxVisibleSurroundingDistance) * 2;
    this.sceneRenderer.resize(sceneSize, this.grid.maxX / 2, this.grid.maxZ / 2);

    // Set camera bounds and center
    this.cameraController.setBounds(this.grid.maxX, this.grid.maxZ);
    this.cameraController.centerOnMap(this.grid.maxX, this.grid.maxZ);
  }

  dispose(): void {
    this.mapRenderer.dispose();
    this.grid.dispose();
  }

  // --- Input callbacks ---

  onTerritoryClick(callback: TerritoryClickCallback): void {
    this.grid.onTerritoryClick(callback);
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

  centerOnMap(): void {
    this.cameraController.centerOnMap(this.grid.maxX, this.grid.maxZ);
  }

  rotate(direction: 'left' | 'right'): void {
    this.cameraController.rotate(direction);
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

  // --- Unit rendering (stubs for Phase 4) ---

  addUnit(unitId: ID, territoryId: ID, playerId: ID): void {
    // TODO: Phase 4 — UnitRenderer
  }

  removeUnit(unitId: ID): void {
    // TODO: Phase 4 — UnitRenderer
  }

  async animateUnitMove(unitId: ID, fromTerritoryId: ID, toTerritoryId: ID, signal?: AbortSignal): Promise<void> {
    // TODO: Phase 4 — UnitRenderer
  }

  setUnitPosition(unitId: ID, territoryId: ID): void {
    // TODO: Phase 4 — UnitRenderer
  }

  setUnitStatus(unitId: ID, statuses: number[]): void {
    // TODO: Phase 4 — UnitRenderer
  }

  setUnitDestination(unitId: ID, destinationId: ID | null): void {
    // TODO: Phase 4 — UnitRenderer
  }
}
