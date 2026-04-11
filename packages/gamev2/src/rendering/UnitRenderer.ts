import {
  ActionManager,
  Animation,
  Color3,
  EasingFunction,
  ExecuteCodeAction,
  LinesMesh,
  Mesh,
  MeshBuilder,
  Scene,
  SineEase,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { ID, Values, GameMap } from '@battles/models';
import { HexCoord, hexCenterTile } from './HexCoordinates';
import { HexGridController } from './HexGridController';
import type { RenderMap } from '../map/MapParser';

const UNIT_HEIGHT = 1.2;
const UNIT_DIAMETER = 0.6;
const UNIT_BASE_Y = UNIT_HEIGHT / 2 + 1;

const UNITS_PER_ROW = 3;
const UNIT_SPACING = 0.7;

const ARRANGE_FRAME_RATE = 30;
const ARRANGE_FRAMES = 8;
const MOVE_FRAME_RATE = 30;
const MOVE_FRAMES_PER_SEGMENT = 12;

type UnitState = {
  mesh: Mesh;
  locationId: ID;
  statusMeshes: Mesh[];
  destinationLine: LinesMesh | null;
  destinationId: ID | null;
};

type UnitClickCallback = (unitId: ID) => void;
type MeshRegistrationCallback = (mesh: Mesh) => void;

/**
 * Renders units as colored cylinders. Handles:
 * - Player colour tinting
 * - Status indicators (defend, starve)
 * - Smooth lerp animation through edge waypoints during moves
 * - Grid arrangement when multiple units share a location, with smooth tween on rearrange
 * - Planned move lines through connecting waypoints
 */
export class UnitRenderer {
  private units = new Map<ID, UnitState>();
  private animatingUnits = new Set<ID>();
  private map: RenderMap | null = null;
  private edgeTerritoryMap = new Map<ID, { territoryA: ID; territoryB: ID }>();
  private clickCallback: UnitClickCallback | null = null;
  private meshRegistrationCallback: MeshRegistrationCallback | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly grid: HexGridController,
    private readonly territoryCoordMap: Map<ID, HexCoord>
  ) { }

  onMeshRegistration(callback: MeshRegistrationCallback): void {
    this.meshRegistrationCallback = callback;
  }

  initialise(map: RenderMap, gameMap: GameMap): void {
    this.map = map;
    this.edgeTerritoryMap.clear();
    for (const edge of gameMap.edges) {
      this.edgeTerritoryMap.set(edge.data.id, {
        territoryA: edge.data.territoryAId,
        territoryB: edge.data.territoryBId,
      });
    }
  }

  onUnitClick(callback: UnitClickCallback): void {
    this.clickCallback = callback;
  }

  // --- Unit lifecycle ---

  addUnit(unitId: ID, locationId: ID, colour: Values.Colour): Mesh | null {
    if (this.units.has(unitId)) return this.units.get(unitId)!.mesh;

    const mesh = MeshBuilder.CreateCylinder(
      `unit-${unitId}`,
      { height: UNIT_HEIGHT, diameter: UNIT_DIAMETER, tessellation: 12 },
      this.scene
    );

    const mat = new StandardMaterial(`unit-mat-${unitId}`, this.scene);
    mat.diffuseColor = this.colourToColor3(colour);
    mat.specularColor = new Color3(0.3, 0.3, 0.3);
    mesh.material = mat;

    mesh.isPickable = true;
    mesh.actionManager = new ActionManager(this.scene);
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.clickCallback?.(unitId);
      })
    );

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
    if (!state) return;

    // Reassign immediately so other units rearrange while this one is in flight
    state.locationId = toLocationId;
    this.animatingUnits.add(unitId);
    this.arrangeLocation(fromLocationId, true);
    this.arrangeLocation(toLocationId, true);

    try {
      const startPos = state.mesh.position.clone();
      const endPos = this.targetUnitPosition(unitId, toLocationId);
      const waypoints = this.getMovementWaypoints(fromLocationId, toLocationId);

      // Build a path: start → waypoint(s) → end
      const path: Vector3[] = [startPos, ...waypoints, endPos];

      for (let i = 0; i < path.length - 1; i++) {
        if (signal?.aborted) break;
        await this.lerpMesh(state.mesh, path[i], path[i + 1], MOVE_FRAMES_PER_SEGMENT);
      }

      if (signal?.aborted) {
        // Snap to final position on abort
        state.mesh.position = endPos;
      }
    } finally {
      this.animatingUnits.delete(unitId);
      // Final reposition in case grid layout changed during animation
      this.arrangeLocation(toLocationId, false);
    }
  }

  // --- Status indicators ---

  setUnitStatus(unitId: ID, statuses: number[]): void {
    const state = this.units.get(unitId);
    if (!state) return;

    // Dispose old status meshes
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
    if (!state) return;

    if (state.destinationId === destinationId) return;
    state.destinationId = destinationId;

    if (state.destinationLine) {
      state.destinationLine.dispose();
      state.destinationLine = null;
    }

    if (!destinationId) return;

    const fromPos = this.targetUnitPosition(unitId, state.locationId);
    const toPos = this.territoryCenterPosition(destinationId);
    if (!toPos) return;

    const waypoints = this.getConnectingWaypoints(state.locationId, destinationId);

    const linePoints: Vector3[] = [
      this.lift(fromPos, 0.1),
      ...waypoints.map((p) => this.lift(p, 0.1)),
      this.lift(toPos, 0.1),
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

  getUnitIds(): ID[] {
    return Array.from(this.units.keys());
  }

  getMeshes(): Mesh[] {
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
    const unitsHere: ID[] = [];
    for (const [uid, state] of this.units) {
      if (state.locationId === locationId) unitsHere.push(uid);
    }

    const basePos = this.locationCenterPosition(locationId);
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
    const basePos = this.locationCenterPosition(locationId);
    if (!basePos || idx < 0) {
      return basePos ?? new Vector3(0, UNIT_BASE_Y, 0);
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

  /** Get the center position for any location (territory or edge). */
  private locationCenterPosition(locationId: ID): Vector3 | null {
    return this.territoryCenterPosition(locationId) ?? this.edgeCenterPosition(locationId);
  }

  private territoryCenterPosition(territoryId: ID): Vector3 | null {
    const coord = this.territoryCoordMap.get(territoryId);
    if (!coord) return null;
    const centerTile = hexCenterTile(coord);
    const pos = this.grid.getWorldPosition(centerTile);
    return new Vector3(pos.x, UNIT_BASE_Y, pos.z);
  }

  /**
   * Compute the center position of an edge.
   * Odd tile chain: center of the middle tile.
   * Even tile chain: midpoint between the two middle tile centers.
   */
  private edgeCenterPosition(edgeId: ID): Vector3 | null {
    const pair = this.edgeTerritoryMap.get(edgeId);
    if (!pair) return null;

    const edge = this.findEdge(pair.territoryA, pair.territoryB);
    if (!edge || edge.grassCoords.length === 0) return null;

    const coordA = this.territoryCoordMap.get(pair.territoryA);
    if (!coordA) return null;

    const sorted = [...edge.grassCoords].sort(
      (a, b) => this.hexDistance(a, coordA) - this.hexDistance(b, coordA)
    );

    const n = sorted.length;
    const mid = Math.floor(n / 2);

    if (n % 2 !== 0) {
      // Odd: center of middle tile
      const centerTile = hexCenterTile(sorted[mid]);
      const pos = this.grid.getWorldPosition(centerTile);
      return new Vector3(pos.x, UNIT_BASE_Y, pos.z);
    } else {
      // Even: midpoint between the two middle tile centers
      const tileA = hexCenterTile(sorted[mid - 1]);
      const tileB = hexCenterTile(sorted[mid]);
      const posA = this.grid.getWorldPosition(tileA);
      const posB = this.grid.getWorldPosition(tileB);
      return new Vector3((posA.x + posB.x) / 2, UNIT_BASE_Y, (posA.z + posB.z) / 2);
    }
  }

  /**
   * Get waypoints for movement between two locations.
   * For territory↔edge moves, returns the half of the edge's tile chain
   * between the territory and the edge center. For territory↔territory
   * (fallback), returns the full chain of waypoints.
   */
  private getMovementWaypoints(fromLocationId: ID, toLocationId: ID): Vector3[] {
    const fromIsEdge = this.edgeTerritoryMap.has(fromLocationId);
    const toIsEdge = this.edgeTerritoryMap.has(toLocationId);

    if (!fromIsEdge && !toIsEdge) {
      // territory → territory fallback: full waypoint chain
      return this.getConnectingWaypoints(fromLocationId, toLocationId);
    }

    const edgeId = fromIsEdge ? fromLocationId : toLocationId;
    const territoryId = fromIsEdge ? toLocationId : fromLocationId;

    const pair = this.edgeTerritoryMap.get(edgeId)!;
    const edge = this.findEdge(pair.territoryA, pair.territoryB);
    if (!edge) return [];

    const territoryCoord = this.territoryCoordMap.get(territoryId);
    if (!territoryCoord) return [];

    // Sort by distance from the territory
    const sorted = [...edge.grassCoords].sort(
      (a, b) => this.hexDistance(a, territoryCoord) - this.hexDistance(b, territoryCoord)
    );

    const mid = Math.floor(sorted.length / 2);

    // Take the tiles between territory and edge center
    const halfChain = sorted.slice(0, mid);

    const positions = halfChain.map((coord) => {
      const centerTile = hexCenterTile(coord);
      const pos = this.grid.getWorldPosition(centerTile);
      return new Vector3(pos.x, UNIT_BASE_Y, pos.z);
    });

    if (fromIsEdge) {
      // edge → territory: reverse so waypoints go from edge center toward territory
      positions.reverse();
    }

    return positions;
  }

  /** Get world positions of waypoints connecting two territories (for destination lines). */
  private getConnectingWaypoints(fromId: ID, toId: ID): Vector3[] {
    if (!this.map) return [];

    const edge = this.findEdge(fromId, toId);
    if (!edge) return [];

    const fromCoord = this.territoryCoordMap.get(fromId);
    if (!fromCoord) return [];

    const sorted = [...edge.grassCoords].sort(
      (a, b) => this.hexDistance(a, fromCoord) - this.hexDistance(b, fromCoord)
    );

    return sorted.map((coord) => {
      const centerTile = hexCenterTile(coord);
      const pos = this.grid.getWorldPosition(centerTile);
      return new Vector3(pos.x, UNIT_BASE_Y, pos.z);
    });
  }

  private findEdge(territoryA: ID, territoryB: ID) {
    return this.map?.edges.find(
      (e) =>
        (e.territoryA === territoryA && e.territoryB === territoryB) ||
        (e.territoryA === territoryB && e.territoryB === territoryA)
    ) ?? null;
  }

  private hexDistance(a: HexCoord, b: HexCoord): number {
    // Axial distance
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return (Math.abs(dx) + Math.abs(dz) + Math.abs(dx + dz)) / 2;
  }

  private async lerpMesh(mesh: Mesh, from: Vector3, to: Vector3, frames: number): Promise<void> {
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

    return new Promise<void>((resolve) => {
      this.scene.beginDirectAnimation(mesh, [animX, animY, animZ], 0, frames, false, 1, () => resolve());
    });
  }

  private tweenMeshTo(mesh: Mesh, target: Vector3, frames: number): void {
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

  private createStatusIndicator(unitId: ID, status: number): Mesh | null {
    // Values.Status: DEFEND=0, STARVE=1
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

  private lift(p: Vector3, dy: number): Vector3 {
    return new Vector3(p.x, p.y + dy, p.z);
  }

  private colourToColor3(colour: Values.Colour): Color3 {
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    return new Color3(r, g, b);
  }
}
