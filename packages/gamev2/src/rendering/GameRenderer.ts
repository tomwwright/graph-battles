import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
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
  private readonly scene: Scene;
  private readonly sceneRenderer: SceneRenderer;
  private readonly cameraController: CameraController;
  readonly grid: HexGridController;
  private readonly assetLoader: AssetLoader;
  private readonly mapRenderer: MapRenderer;

  private parsedMap: ParsedMap | null = null;
  // territory ID → hex coord, for camera focus
  private territoryCoordMap = new Map<ID, HexCoord>();

  // Unit meshes (placeholder cylinders)
  private unitMeshes = new Map<ID, AbstractMesh>();
  private unitTerritoryMap = new Map<ID, ID>(); // unitId → territoryId

  constructor(scene: Scene, camera: ArcRotateCamera) {
    this.scene = scene;
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
    for (const mesh of this.unitMeshes.values()) {
      mesh.dispose();
    }
    this.unitMeshes.clear();
    this.unitTerritoryMap.clear();
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

  // --- Unit rendering (placeholder) ---

  addUnit(unitId: ID, territoryId: ID, colour: Values.Colour): void {
    if (this.unitMeshes.has(unitId)) return;

    const mesh = MeshBuilder.CreateCylinder(
      `unit-${unitId}`,
      { height: 1.2, diameter: 0.6, tessellation: 12 },
      this.scene
    );

    const mat = new StandardMaterial(`unit-mat-${unitId}`, this.scene);
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    mat.diffuseColor = new Color3(r, g, b);
    mat.specularColor = new Color3(0.3, 0.3, 0.3);
    mesh.material = mat;

    this.unitMeshes.set(unitId, mesh);
    this.unitTerritoryMap.set(unitId, territoryId);

    this.positionUnit(unitId, territoryId);
    this.sceneRenderer.registerMeshes([mesh]);
  }

  removeUnit(unitId: ID): void {
    const mesh = this.unitMeshes.get(unitId);
    if (mesh) {
      mesh.dispose();
      this.unitMeshes.delete(unitId);
      this.unitTerritoryMap.delete(unitId);
    }
  }

  setUnitPosition(unitId: ID, territoryId: ID): void {
    this.unitTerritoryMap.set(unitId, territoryId);
    this.positionUnit(unitId, territoryId);
  }

  async animateUnitMove(unitId: ID, fromTerritoryId: ID, toTerritoryId: ID, signal?: AbortSignal): Promise<void> {
    // Simple snap for now — Phase 4 will add lerp animation through grass hex
    this.setUnitPosition(unitId, toTerritoryId);
  }

  setUnitStatus(unitId: ID, statuses: number[]): void {
    // TODO: Phase 4 — status indicators
  }

  setUnitDestination(unitId: ID, destinationId: ID | null): void {
    // TODO: Phase 4 — planned move lines
  }

  /** Reposition all units on a given territory in a grid layout */
  private positionUnit(unitId: ID, territoryId: ID): void {
    const coord = this.territoryCoordMap.get(territoryId);
    if (!coord) return;

    // Get all units on this territory
    const unitsOnTerritory: ID[] = [];
    for (const [uid, tid] of this.unitTerritoryMap) {
      if (tid === territoryId) unitsOnTerritory.push(uid);
    }

    const centerTile = hexCenterTile(coord);
    const basePos = this.grid.getWorldPosition(centerTile);

    const UNITS_PER_ROW = 3;
    const SPACING = 0.7;

    for (let i = 0; i < unitsOnTerritory.length; i++) {
      const mesh = this.unitMeshes.get(unitsOnTerritory[i]);
      if (!mesh) continue;

      const row = Math.floor(i / UNITS_PER_ROW);
      const col = i % UNITS_PER_ROW;
      const rowCount = Math.min(unitsOnTerritory.length - row * UNITS_PER_ROW, UNITS_PER_ROW);

      const offsetX = (col - (rowCount - 1) / 2) * SPACING;
      const offsetZ = (row - (Math.ceil(unitsOnTerritory.length / UNITS_PER_ROW) - 1) / 2) * SPACING;

      mesh.position = new Vector3(basePos.x + offsetX, 1.2, basePos.z + offsetZ);
    }
  }
}
