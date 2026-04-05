import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { ID } from '@battles/models';

type TerritoryClickCallback = (territoryId: ID) => void;
type TerritoryHoverCallback = (territoryId: ID | null) => void;

/**
 * Facade for the rendering layer. Only rendering interface the orchestrator uses.
 * Delegates to internal renderer classes (SceneRenderer, CameraController,
 * HexGridController, MapRenderer, UnitRenderer).
 */
export class GameRenderer {
  private scene: Scene;
  private camera: Camera;

  private territoryClickCallback: TerritoryClickCallback | null = null;
  private territoryHoverCallback: TerritoryHoverCallback | null = null;

  constructor(scene: Scene, camera: Camera) {
    this.scene = scene;
    this.camera = camera;

    // TODO: Instantiate internal renderers:
    // - SceneRenderer (lighting, shadows, SSAO, skybox, ground)
    // - CameraController (bounds, panning, rotation)
    // - HexGridController (hit detection tiles, overlays)
    // - AssetLoader (GLB loading/caching)
    // - MapRenderer (territory mesh placement)
    // - UnitRenderer (unit mesh management)
  }

  // --- Lifecycle ---

  /**
   * Initialise the scene environment and load the map.
   */
  async initialise(): Promise<void> {
    // TODO: Set up scene environment via SceneRenderer
    // TODO: Load assets via AssetLoader
    // TODO: Build hex grid via HexGridController
    // TODO: Place map tiles via MapRenderer
  }

  dispose(): void {
    // TODO: Clean up all renderers
  }

  // --- Input callbacks ---

  onTerritoryClick(callback: TerritoryClickCallback): void {
    this.territoryClickCallback = callback;
  }

  onTerritoryHover(callback: TerritoryHoverCallback): void {
    this.territoryHoverCallback = callback;
  }

  // --- Camera ---

  async focusOn(territoryId: ID): Promise<void> {
    // TODO: Animate camera to focus on territory via CameraController
  }

  async centerOnMap(): Promise<void> {
    // TODO: Center camera on map bounds via CameraController
  }

  // --- Map rendering ---

  updateTerritoryOverlay(territoryId: ID, color: string | null, alpha?: number): void {
    // TODO: Set overlay on territory's hex tiles via HexGridController
  }

  updateTerritoryComposition(territoryId: ID): void {
    // TODO: Recompute and swap tile meshes via MapRenderer + TerritoryComposition
  }

  // --- Unit rendering ---

  addUnit(unitId: ID, territoryId: ID, playerId: ID): void {
    // TODO: Create unit mesh at territory position via UnitRenderer
  }

  removeUnit(unitId: ID): void {
    // TODO: Remove unit mesh via UnitRenderer
  }

  async animateUnitMove(unitId: ID, fromTerritoryId: ID, toTerritoryId: ID, signal?: AbortSignal): Promise<void> {
    // TODO: Animate unit along path (territory -> grass -> territory) via UnitRenderer
  }

  setUnitPosition(unitId: ID, territoryId: ID): void {
    // TODO: Snap unit to territory position (no animation) via UnitRenderer
  }

  setUnitStatus(unitId: ID, statuses: number[]): void {
    // TODO: Update unit status indicators via UnitRenderer
  }

  setUnitDestination(unitId: ID, destinationId: ID | null): void {
    // TODO: Show/hide planned move line via UnitRenderer
  }
}
