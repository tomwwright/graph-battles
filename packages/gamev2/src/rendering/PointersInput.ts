import {
  ArcRotateCamera,
  ICameraInput,
  Nullable,
  Observer,
  PointerEventTypes,
  PointerInfo,
} from '@babylonjs/core';
import { CameraController } from './CameraController';

type PointerState = {
  x: number;
  y: number;
  type: string;
  downX: number;
  downY: number;
  downTime: number;
  multitouch: boolean;
};

const DOUBLE_TAP_MS = 300;
const TAP_MAX_MOVE_PX = 10;
const DOUBLE_TAP_MAX_DIST_PX = 30;

/**
 * Touch:
 *  - 1 pointer drag → pan
 *  - 2 pointer drag → rotate (alpha) + pinch zoom
 *  - double-tap     → cycle zoom
 *
 * Mouse:
 *  - left drag      → rotate
 *  - right/middle   → pan
 *  - double-click   → cycle zoom
 *  (wheel zoom handled by ArcRotateCameraMouseWheelInput)
 */
export class PointersInput implements ICameraInput<ArcRotateCamera> {
  camera!: ArcRotateCamera;

  panSensibility = 800;
  rotateSensibility = 400;
  pinchSensibility = 50;

  twoFingerLockThresholdPx = 64;

  private pointers = new Map<number, PointerState>();
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private pinchDistance: number | null = null;
  private twoFingerMode: 'idle' | 'pinch' | 'rotate' = 'idle';
  private gestureBaseDist = 0;
  private gestureBaseMidX = 0;
  private gestureBaseMidY = 0;
  private lastMidX = 0;
  private lastMidY = 0;
  private observer: Nullable<Observer<PointerInfo>> = null;

  constructor(private readonly controller: CameraController) { }

  getClassName(): string {
    return 'GraphBattlesPointersInput';
  }

  getSimpleName(): string {
    return 'graphBattlesPointers';
  }

  attachControl(_noPreventDefault?: boolean): void {
    const scene = this.camera.getScene();
    this.observer = scene.onPointerObservable.add((info) => this.handle(info));
  }

  detachControl(): void {
    if (this.observer) {
      this.camera.getScene().onPointerObservable.remove(this.observer);
      this.observer = null;
    }
    this.pointers.clear();
    this.pinchDistance = null;
    this.twoFingerMode = 'idle';
  }

  private handle(info: PointerInfo): void {
    const ev = info.event as PointerEvent;
    switch (info.type) {
      case PointerEventTypes.POINTERDOWN:
        this.onDown(ev);
        break;
      case PointerEventTypes.POINTERMOVE:
        this.onMove(ev);
        break;
      case PointerEventTypes.POINTERUP:
      case PointerEventTypes.POINTERDOUBLETAP:
        // ignore Babylon's synthetic doubletap; use POINTERUP for own logic
        if (info.type === PointerEventTypes.POINTERUP) {
          this.onUp(ev);
        }
        break;
    }
  }

  private onDown(ev: PointerEvent): void {
    this.pointers.set(ev.pointerId, {
      x: ev.clientX,
      y: ev.clientY,
      type: ev.pointerType,
      downX: ev.clientX,
      downY: ev.clientY,
      downTime: performance.now(),
      multitouch: this.pointers.size > 0,
    });
    if (this.pointers.size > 1) {
      // mark all current pointers as multitouch so tap detection skips them
      for (const p of this.pointers.values()) p.multitouch = true;
      if (ev.pointerType === 'touch' && this.pointers.size === 2) {
        const dist = this.touchDistance();
        const mid = this.touchMidpoint();
        this.twoFingerMode = 'idle';
        this.pinchDistance = dist;
        this.gestureBaseDist = dist;
        this.gestureBaseMidX = mid.x;
        this.gestureBaseMidY = mid.y;
        this.lastMidX = mid.x;
        this.lastMidY = mid.y;
      }
    }
  }

  private onMove(ev: PointerEvent): void {
    const state = this.pointers.get(ev.pointerId);
    if (!state) return;
    const dx = ev.clientX - state.x;
    const dy = ev.clientY - state.y;
    state.x = ev.clientX;
    state.y = ev.clientY;

    if (state.type === 'mouse') {
      if ((ev.buttons & 1) === 1) {
        this.applyRotate(dx);
      } else if ((ev.buttons & 6) !== 0) {
        this.applyPan(dx, dy);
      }
      return;
    }

    if (state.type === 'touch') {
      if (this.pointers.size === 1) {
        this.applyPan(dx, dy);
      } else if (this.pointers.size === 2) {
        this.handleTwoFingerMove();
      }
    }
  }

  private handleTwoFingerMove(): void {
    const newDist = this.touchDistance();
    const mid = this.touchMidpoint();

    if (this.twoFingerMode === 'idle') {
      const distDelta = Math.abs(newDist - this.gestureBaseDist);
      const midDelta = Math.hypot(mid.x - this.gestureBaseMidX, mid.y - this.gestureBaseMidY);
      if (distDelta < this.twoFingerLockThresholdPx && midDelta < this.twoFingerLockThresholdPx) {
        return;
      }
      this.twoFingerMode = distDelta > midDelta ? 'pinch' : 'rotate';
      // reset baselines so the lock-detection movement is not applied
      this.pinchDistance = newDist;
      this.lastMidX = mid.x;
      this.lastMidY = mid.y;
      return;
    }

    if (this.twoFingerMode === 'pinch') {
      if (this.pinchDistance != null) {
        this.applyPinch(newDist - this.pinchDistance);
      }
      this.pinchDistance = newDist;
    } else if (this.twoFingerMode === 'rotate') {
      this.applyRotate(mid.x - this.lastMidX);
      this.lastMidX = mid.x;
      this.lastMidY = mid.y;
    }
  }

  private onUp(ev: PointerEvent): void {
    const state = this.pointers.get(ev.pointerId);
    this.pointers.delete(ev.pointerId);
    if (this.pointers.size < 2) {
      this.pinchDistance = null;
      this.twoFingerMode = 'idle';
    }

    if (!state) return;
    if (state.multitouch) return;

    const moved = Math.hypot(ev.clientX - state.downX, ev.clientY - state.downY);
    const elapsed = performance.now() - state.downTime;
    if (moved >= TAP_MAX_MOVE_PX || elapsed >= DOUBLE_TAP_MS) return;

    const now = performance.now();
    const dt = now - this.lastTapTime;
    const dpos = Math.hypot(ev.clientX - this.lastTapX, ev.clientY - this.lastTapY);
    if (dt < DOUBLE_TAP_MS && dpos < DOUBLE_TAP_MAX_DIST_PX) {
      this.controller.cycleZoom();
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapX = ev.clientX;
      this.lastTapY = ev.clientY;
    }
  }

  private touchDistance(): number {
    const ps = Array.from(this.pointers.values()).filter((p) => p.type === 'touch');
    if (ps.length < 2) return 0;
    return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
  }

  private touchMidpoint(): { x: number; y: number } {
    const ps = Array.from(this.pointers.values()).filter((p) => p.type === 'touch');
    if (ps.length < 2) return { x: 0, y: 0 };
    return { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
  }

  private applyPan(dx: number, dy: number): void {
    this.camera.inertialPanningX += -dx / this.panSensibility;
    this.camera.inertialPanningY += dy / this.panSensibility;
  }

  private applyRotate(dx: number): void {
    this.camera.inertialAlphaOffset -= dx / this.rotateSensibility;
  }

  private applyPinch(delta: number): void {
    this.camera.inertialRadiusOffset += delta / this.pinchSensibility;
  }
}
