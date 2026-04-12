import {
  ActionManager,
  Animatable,
  Animation,
  ArcRotateCamera,
  EasingFunction,
  ExecuteCodeAction,
  Nullable,
  SineEase,
  Vector3,
} from '@babylonjs/core';

export class CameraController {
  readonly maxVisibleSurroundingDistance: number;
  private currentAnimation: Nullable<Animatable> = null;
  private maxX: number;
  private maxZ: number;

  constructor(private readonly camera: ArcRotateCamera) {
    const maxCameraDistance = 25;
    const cameraAngleDegrees = (Math.PI / 180) * 40;

    this.maxX = 10;
    this.maxZ = 10;

    camera.radius = 10;
    camera.upperRadiusLimit = maxCameraDistance;
    camera.lowerRadiusLimit = 1.5;
    camera.alpha = 0;
    camera.mapPanning = true;
    camera.lowerBetaLimit = cameraAngleDegrees;
    camera.upperBetaLimit = cameraAngleDegrees;
    camera.maxZ = 100;

    this.maxVisibleSurroundingDistance = Math.sin(cameraAngleDegrees) * maxCameraDistance * 2.25;

    const scene = camera.getScene();
    scene.actionManager = scene.actionManager ?? new ActionManager(scene);
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnEveryFrameTrigger, () => {
        const target = camera.target;
        if (target.x < 0) target.x = 0;
        if (target.x > this.maxX) target.x = this.maxX;
        if (target.z < 0) target.z = 0;
        if (target.z > this.maxZ) target.z = this.maxZ;
      })
    );
  }

  setBounds(maxX: number, maxZ: number): void {
    this.maxX = maxX;
    this.maxZ = maxZ;
  }

  centerCamera(): void {
    this.camera.target = new Vector3(this.maxX * 0.66, this.camera.target.y, this.maxZ / 2);
    this.camera.alpha = 0;
  }

  async focusOn(position: Vector3): Promise<void> {
    const frameRate = 30;
    const totalFrames = frameRate;

    const animX = new Animation('focusX', 'target.x', frameRate, Animation.ANIMATIONTYPE_FLOAT);
    const animZ = new Animation('focusZ', 'target.z', frameRate, Animation.ANIMATIONTYPE_FLOAT);

    const easing = new SineEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animX.setEasingFunction(easing);
    animZ.setEasingFunction(easing);

    animX.setKeys([
      { frame: 0, value: this.camera.target.x },
      { frame: totalFrames, value: position.x },
    ]);
    animZ.setKeys([
      { frame: 0, value: this.camera.target.z },
      { frame: totalFrames, value: position.z },
    ]);

    return new Promise<void>((resolve) => {
      this.camera.getScene().beginDirectAnimation(
        this.camera,
        [animX, animZ],
        0,
        totalFrames,
        false,
        2,
        () => resolve()
      );
    });
  }

  rotate(direction: 'left' | 'right'): void {
    if (this.currentAnimation) return;

    const frameRate = 30;
    const rotate = new Animation('rotation', 'alpha', frameRate, Animation.ANIMATIONTYPE_FLOAT);

    const easing = new SineEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    rotate.setEasingFunction(easing);

    const start = this.camera.alpha;
    const amount = Math.PI / 3;
    const end = direction === 'left' ? start + amount : start - amount;

    rotate.setKeys([
      { frame: 0, value: start },
      { frame: frameRate, value: end },
    ]);

    this.currentAnimation = this.camera.getScene().beginDirectAnimation(
      this.camera,
      [rotate],
      0,
      frameRate,
      false,
      2,
      () => {
        this.currentAnimation = null;
      }
    );
  }
}
