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
import { UnitRenderer } from './UnitRenderer';
import { ParsedMap } from '../map/MapParser';
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
  readonly grid: HexGridController;
  private readonly assetLoader: AssetLoader;
  private readonly mapRenderer: MapRenderer;
  private readonly unitRenderer: UnitRenderer;

  private parsedMap: ParsedMap | null = null;
  // territory ID → hex coord, for camera focus
  private territoryCoordMap = new Map<ID, HexCoord>();

  constructor(scene: Scene, camera: ArcRotateCamera) {
    this.sceneRenderer = new SceneRenderer(scene, camera);
    this.cameraController = new CameraController(camera);
    this.grid = new HexGridController(scene);
    this.assetLoader = new AssetLoader(scene);
    this.mapRenderer = new MapRenderer(scene, this.grid, this.assetLoader);
    this.unitRenderer = new UnitRenderer(scene, this.grid, this.territoryCoordMap);
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

    this.unitRenderer.setParsedMap(parsedMap);

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

  /**
   * Highlight grass cells of the edge connecting two territories.
   * Used to visualise movement paths when units are selected.
   */
  highlightConnectingGrass(territoryA: ID, territoryB: ID, color: Color3, alpha: number = 0.15): void {
    if (!this.parsedMap) return;
    const edge = this.parsedMap.edges.find(
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

  // --- Unit rendering (delegates to UnitRenderer) ---

  addUnit(unitId: ID, territoryId: ID, colour: Values.Colour): void {
    const mesh = this.unitRenderer.addUnit(unitId, territoryId, colour);
    if (mesh) {
      this.sceneRenderer.registerMeshes([mesh]);
    }
  }

  removeUnit(unitId: ID): void {
    this.unitRenderer.removeUnit(unitId);
  }

  setUnitPosition(unitId: ID, territoryId: ID): void {
    this.unitRenderer.setUnitPosition(unitId, territoryId);
  }

  async animateUnitMove(unitId: ID, fromTerritoryId: ID, toTerritoryId: ID, signal?: AbortSignal): Promise<void> {
    await this.unitRenderer.animateUnitMove(unitId, fromTerritoryId, toTerritoryId, signal);
  }

  setUnitStatus(unitId: ID, statuses: number[]): void {
    this.unitRenderer.setUnitStatus(unitId, statuses);
  }

  setUnitDestination(unitId: ID, destinationId: ID | null): void {
    this.unitRenderer.setUnitDestination(unitId, destinationId);
  }

  clearAllUnitDestinations(): void {
    this.unitRenderer.clearAllDestinations();
  }
}
