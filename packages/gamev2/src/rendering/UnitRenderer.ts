import {
  AbstractMesh,
  ActionManager,
  Animation,
  Color3,
  EasingFunction,
  ExecuteCodeAction,
  LinesMesh,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SineEase,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { ID, Values } from '@battles/models';
import { Navigation } from './Navigation';
import { AssetLoader } from './AssetLoader';
import type { HoverInfo } from '../state/types';

const UNIT_HEIGHT = 1.2;
const UNIT_BASE_Y = UNIT_HEIGHT / 2 + 1;
const DESTINATION_LINE_Y = UNIT_BASE_Y + 0.1;

const UNITS_PER_ROW = 3;
const UNIT_SPACING = 1.4;

const ARRANGE_FRAME_RATE = 30;
const ARRANGE_FRAMES = 8;
const MOVE_FRAME_RATE = 30;
const MOVE_FRAMES_PER_SEGMENT = 12;

type UnitState = {
  mesh: AbstractMesh;
  locationId: ID;
  statusMeshes: Mesh[];
  destinationLine: LinesMesh | null;
  destinationId: ID | null;
};

type UnitClickCallback = (unitId: ID) => void;
type HoverCallback = (hover: HoverInfo) => void;
type MeshRegistrationCallback = (mesh: AbstractMesh) => void;

/**
 * Renders units from the unit.glb asset. Handles:
 * - Status indicators (defend, starve)
 * - Smooth lerp animation through edge waypoints during moves
 * - Grid arrangement when multiple units share a location, with smooth tween on rearrange
 * - Planned move lines through connecting waypoints
 */
export class UnitRenderer {
  private units = new Map<ID, UnitState>();
  private animatingUnits = new Set<ID>();
  private navigation: Navigation | null = null;
  private clickCallback: UnitClickCallback | null = null;
  private hoverCallback: HoverCallback | null = null;
  private meshRegistrationCallback: MeshRegistrationCallback | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly assetLoader: AssetLoader,
  ) { }

  onMeshRegistration(callback: MeshRegistrationCallback): void {
    this.meshRegistrationCallback = callback;
  }

  initialise(navigation: Navigation): void {
    this.navigation = navigation;
  }

  onUnitClick(callback: UnitClickCallback): void {
    this.clickCallback = callback;
  }

  onHover(callback: HoverCallback): void {
    this.hoverCallback = callback;
  }

  // --- Unit lifecycle ---

  addUnit(unitId: ID, locationId: ID, colour: Values.Colour): AbstractMesh | null {
    if (this.units.has(unitId)) return this.units.get(unitId)!.mesh;

    const mesh = this.assetLoader.cloneUnit(`unit-${unitId}`);
    if (!mesh) return null;

    this.tintPlayerMaterial(mesh, unitId, colour);
    this.attachUnitPicking(mesh, unitId);

    this.units.set(unitId, {
      mesh,
      locationId,
      statusMeshes: [],
      destinationLine: null,
      destinationId: null,
    });

    this.meshRegistrationCallback?.(mesh);
    this.arrangeLocation(locationId, false);
    return mesh;
  }

  private tintPlayerMaterial(root: AbstractMesh, unitId: ID, colour: Values.Colour): void {
    const tint = this.colourToColor3(colour);
    const meshes: AbstractMesh[] = [root, ...root.getChildMeshes()];
    for (const m of meshes) {
      const mat = m.material;
      if (!mat || !mat.name.startsWith('Player')) continue;
      const cloned = mat.clone(`Player-${unitId}`);
      if (!cloned) continue;
      if (cloned instanceof PBRMaterial) {
        cloned.albedoColor = tint;
      } else if (cloned instanceof StandardMaterial) {
        cloned.diffuseColor = tint;
      }
      m.material = cloned;
    }
  }

  private colourToColor3(colour: Values.Colour): Color3 {
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    return new Color3(r, g, b);
  }

  private attachUnitPicking(root: AbstractMesh, unitId: ID): void {
    const apply = (m: AbstractMesh) => {
      m.isPickable = true;
      m.actionManager = new ActionManager(this.scene);
      m.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.clickCallback?.(unitId);
        })
      );
      m.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          const locationId = this.units.get(unitId)?.locationId;
          if (!locationId) return;
          this.hoverCallback?.({ type: 'unit', unitId });
        })
      );
      m.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          this.hoverCallback?.(null);
        })
      );
    };
    apply(root);
    for (const child of root.getChildMeshes()) apply(child);
  }

  removeUnit(unitId: ID): void {
    const state = this.units.get(unitId);
    if (!state) return;

    state.mesh.dispose();
    for (const sm of state.statusMeshes) sm.dispose();
    if (state.destinationLine) state.destinationLine.dispose();

    const locationId = state.locationId;
    this.units.delete(unitId);
    this.animatingUnits.delete(unitId);

    this.arrangeLocation(locationId, true);
  }

  /** Snap unit to a location (territory or edge) without animation. */
  setUnitPosition(unitId: ID, locationId: ID): void {
    const state = this.units.get(unitId);
    if (!state) return;

    const oldLocationId = state.locationId;
    state.locationId = locationId;

    if (oldLocationId !== locationId) {
      this.arrangeLocation(oldLocationId, true);
    }
    this.arrangeLocation(locationId, false);
  }

  /** Lerp unit between any two locations (territory or edge). */
  async animateUnitMove(
    unitId: ID,
    fromLocationId: ID,
    toLocationId: ID,
    signal?: AbortSignal
  ): Promise<void> {
    const state = this.units.get(unitId);
    if (!state || !this.navigation) return;

    state.locationId = toLocationId;
    this.animatingUnits.add(unitId);
    this.arrangeLocation(fromLocationId, true);
    this.arrangeLocation(toLocationId, true);

    try {
      const startPos = state.mesh.position.clone();
      const endPos = this.targetUnitPosition(unitId, toLocationId);
      const waypoints = this.navigation.path(fromLocationId, toLocationId);

      const path: Vector3[] = [
        startPos,
        ...waypoints.map((p) => this.lift(p, UNIT_BASE_Y)),
        endPos,
      ];

      for (let i = 0; i < path.length - 1; i++) {
        if (signal?.aborted) break;
        await this.lerpMesh(state.mesh, path[i], path[i + 1], MOVE_FRAMES_PER_SEGMENT);
      }

      if (signal?.aborted) {
        state.mesh.position = endPos;
      }
    } finally {
      this.animatingUnits.delete(unitId);
      this.arrangeLocation(toLocationId, false);
    }
  }

  // --- Status indicators ---

  setUnitStatus(unitId: ID, statuses: number[]): void {
    const state = this.units.get(unitId);
    if (!state) return;

    for (const sm of state.statusMeshes) sm.dispose();
    state.statusMeshes = [];

    let stackY = UNIT_HEIGHT / 2 + 0.2;
    for (const status of statuses) {
      const indicator = this.createStatusIndicator(unitId, status);
      if (!indicator) continue;
      indicator.parent = state.mesh;
      indicator.position = new Vector3(0, stackY, 0);
      state.statusMeshes.push(indicator);
      stackY += 0.25;
    }
  }

  // --- Planned move lines ---

  setUnitDestination(unitId: ID, destinationId: ID | null): void {
    const state = this.units.get(unitId);
    if (!state || !this.navigation) return;

    if (state.destinationId === destinationId) return;
    state.destinationId = destinationId;

    if (state.destinationLine) {
      state.destinationLine.dispose();
      state.destinationLine = null;
    }

    if (!destinationId) return;

    const fromPos = this.targetUnitPosition(unitId, state.locationId);
    const toPos = this.navigation.locationCenter(destinationId);
    if (!toPos) return;

    const waypoints = this.navigation.path(state.locationId, destinationId);

    const linePoints: Vector3[] = [
      new Vector3(fromPos.x, DESTINATION_LINE_Y, fromPos.z),
      ...waypoints.map((p) => new Vector3(p.x, DESTINATION_LINE_Y, p.z)),
      new Vector3(toPos.x, DESTINATION_LINE_Y, toPos.z),
    ];

    const line = MeshBuilder.CreateLines(
      `move-line-${unitId}`,
      { points: linePoints, updatable: false },
      this.scene
    );
    line.color = new Color3(1.0, 1.0, 0.3);
    line.isPickable = false;
    state.destinationLine = line;
  }

  clearAllDestinations(): void {
    for (const [unitId] of this.units) {
      this.setUnitDestination(unitId, null);
    }
  }

  // --- Lookup helpers ---

  hasUnit(unitId: ID): boolean {
    return this.units.has(unitId);
  }

  getMesh(unitId: ID): AbstractMesh | null {
    return this.units.get(unitId)?.mesh ?? null;
  }

  getUnitIds(): ID[] {
    return Array.from(this.units.keys());
  }

  getMeshes(): AbstractMesh[] {
    return Array.from(this.units.values()).map((u) => u.mesh);
  }

  dispose(): void {
    for (const [unitId] of this.units) {
      this.removeUnit(unitId);
    }
    this.units.clear();
    this.animatingUnits.clear();
  }

  // --- Internals ---

  /**
   * Arranges all units on a location (territory or edge) in a grid layout.
   * Skips units currently animating (their position is being lerped).
   * @param tween if true, smoothly tween non-animating units to their new positions
   */
  private arrangeLocation(locationId: ID, tween: boolean): void {
    if (!this.navigation) return;

    const unitsHere: ID[] = [];
    for (const [uid, state] of this.units) {
      if (state.locationId === locationId) unitsHere.push(uid);
    }

    const basePos = this.navigation.locationCenter(locationId);
    if (!basePos) return;

    const total = unitsHere.length;
    const totalRows = Math.ceil(total / UNITS_PER_ROW);

    for (let i = 0; i < unitsHere.length; i++) {
      const uid = unitsHere[i];
      if (this.animatingUnits.has(uid)) continue;

      const state = this.units.get(uid);
      if (!state) continue;

      const row = Math.floor(i / UNITS_PER_ROW);
      const col = i % UNITS_PER_ROW;
      const rowCount = Math.min(total - row * UNITS_PER_ROW, UNITS_PER_ROW);
      const offsetX = (col - (rowCount - 1) / 2) * UNIT_SPACING;
      const offsetZ = (row - (totalRows - 1) / 2) * UNIT_SPACING;

      const target = new Vector3(basePos.x + offsetX, UNIT_BASE_Y, basePos.z + offsetZ);

      if (tween && !state.mesh.position.equalsWithEpsilon(target, 0.001)) {
        this.tweenMeshTo(state.mesh, target, ARRANGE_FRAMES);
      } else {
        state.mesh.position = target;
      }
    }
  }

  /** Compute the grid position a unit will occupy on its location (without moving the mesh). */
  private targetUnitPosition(unitId: ID, locationId: ID): Vector3 {
    const unitsHere: ID[] = [];
    for (const [uid, state] of this.units) {
      if (state.locationId === locationId) unitsHere.push(uid);
    }

    const idx = unitsHere.indexOf(unitId);
    const basePos = this.navigation?.locationCenter(locationId) ?? null;
    if (!basePos || idx < 0) {
      return basePos
        ? new Vector3(basePos.x, UNIT_BASE_Y, basePos.z)
        : new Vector3(0, UNIT_BASE_Y, 0);
    }

    const total = unitsHere.length;
    const totalRows = Math.ceil(total / UNITS_PER_ROW);
    const row = Math.floor(idx / UNITS_PER_ROW);
    const col = idx % UNITS_PER_ROW;
    const rowCount = Math.min(total - row * UNITS_PER_ROW, UNITS_PER_ROW);
    const offsetX = (col - (rowCount - 1) / 2) * UNIT_SPACING;
    const offsetZ = (row - (totalRows - 1) / 2) * UNIT_SPACING;

    return new Vector3(basePos.x + offsetX, UNIT_BASE_Y, basePos.z + offsetZ);
  }

  private async lerpMesh(mesh: AbstractMesh, from: Vector3, to: Vector3, frames: number): Promise<void> {
    const animX = new Animation('moveX', 'position.x', MOVE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);
    const animY = new Animation('moveY', 'position.y', MOVE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);
    const animZ = new Animation('moveZ', 'position.z', MOVE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);

    const easing = new SineEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animX.setEasingFunction(easing);
    animY.setEasingFunction(easing);
    animZ.setEasingFunction(easing);

    animX.setKeys([{ frame: 0, value: from.x }, { frame: frames, value: to.x }]);
    animY.setKeys([{ frame: 0, value: from.y }, { frame: frames, value: to.y }]);
    animZ.setKeys([{ frame: 0, value: from.z }, { frame: frames, value: to.z }]);

    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const animations: Animation[] = [animX, animY, animZ];
    if (dx !== 0 || dz !== 0) {
      const targetYaw = this.nearestAngle(mesh.rotation.y, Math.atan2(-dx, -dz));
      const animYaw = new Animation('moveYaw', 'rotation.y', MOVE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);
      animYaw.setEasingFunction(easing);
      animYaw.setKeys([{ frame: 0, value: mesh.rotation.y }, { frame: frames, value: targetYaw }]);
      animations.push(animYaw);
    }

    return new Promise<void>((resolve) => {
      this.scene.beginDirectAnimation(mesh, animations, 0, frames, false, 1, () => resolve());
    });
  }

  private tweenMeshTo(mesh: AbstractMesh, target: Vector3, frames: number): void {
    const from = mesh.position.clone();
    const animX = new Animation('arrX', 'position.x', ARRANGE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);
    const animZ = new Animation('arrZ', 'position.z', ARRANGE_FRAME_RATE, Animation.ANIMATIONTYPE_FLOAT);

    const easing = new SineEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animX.setEasingFunction(easing);
    animZ.setEasingFunction(easing);

    animX.setKeys([{ frame: 0, value: from.x }, { frame: frames, value: target.x }]);
    animZ.setKeys([{ frame: 0, value: from.z }, { frame: frames, value: target.z }]);

    this.scene.beginDirectAnimation(mesh, [animX, animZ], 0, frames, false);
  }

  private nearestAngle(current: number, target: number): number {
    const TWO_PI = Math.PI * 2;
    let t = target;
    while (t - current > Math.PI) t -= TWO_PI;
    while (t - current < -Math.PI) t += TWO_PI;
    return t;
  }

  private createStatusIndicator(unitId: ID, status: number): Mesh | null {
    const isDefend = status === Values.Status.DEFEND;
    const isStarve = status === Values.Status.STARVE;
    if (!isDefend && !isStarve) return null;

    const mesh = MeshBuilder.CreateBox(
      `unit-status-${unitId}-${status}`,
      { size: 0.2 },
      this.scene
    );
    const mat = new StandardMaterial(`unit-status-mat-${unitId}-${status}`, this.scene);
    mat.diffuseColor = isDefend ? new Color3(0.7, 0.85, 1.0) : new Color3(1.0, 0.4, 0.2);
    mat.emissiveColor = isDefend ? new Color3(0.2, 0.3, 0.5) : new Color3(0.4, 0.1, 0.0);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }

  private lift(p: Vector3, y: number): Vector3 {
    return new Vector3(p.x, y, p.z);
  }
}
