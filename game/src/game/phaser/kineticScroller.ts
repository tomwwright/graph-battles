import * as Phaser from 'phaser-ce';
import PhaserStore from 'game/stores/phaser';

export default class KineticScroller {
  sprite: Phaser.Image;
  phaserStore: PhaserStore;

  startScrollPosition: Phaser.Point;
  previousScrollPosition: Phaser.Point;
  scrollVelocity: Phaser.Point;
  startCameraPosition: Phaser.Point;

  constructor(phaserStore: PhaserStore) {
    this.phaserStore = phaserStore;

    this.sprite = phaserStore.phaser.add.image();
    this.sprite.width = phaserStore.phaser.world.width;
    this.sprite.height = phaserStore.phaser.world.height;
    this.sprite.fixedToCamera = true;
    this.sprite.sendToBack();

    this.initialiseInputEvents();
  }

  initialiseInputEvents() {
    this.sprite.inputEnabled = true;
    const self = this;

    this.sprite.events.onInputDown.add((obj: Phaser.Image, pointer: Phaser.Pointer) => {
      this.phaserStore.phaser.input.addMoveCallback(this.onScroll, this);
      this.phaserStore.phaser.input.onUp.add(this.onScrollEnd, this);

      this.startScrollPosition = pointer.position.clone();
      this.previousScrollPosition = this.startScrollPosition.clone();
      this.startCameraPosition = this.phaserStore.phaser.camera.position.clone();
    });
  }

  onScroll(pointer: Phaser.Pointer, x: number, y: number) {
    const cameraPosition = Phaser.Point.add(this.startCameraPosition, Phaser.Point.subtract(this.startScrollPosition, pointer.position));
    this.phaserStore.phaser.camera.setPosition(cameraPosition.x, cameraPosition.y);

    const elapsedSeconds = this.phaserStore.phaser.time.elapsed / 1000;
    this.scrollVelocity = Phaser.Point.subtract(pointer.position, this.previousScrollPosition).divide(elapsedSeconds, elapsedSeconds);
    this.previousScrollPosition.set(pointer.position.x, pointer.position.y);
  }

  onScrollEnd() {
    if (this.scrollVelocity) {
      this.scrollVelocity.divide(4, 4);
      const cameraCenter = this.phaserStore.phaser.camera.position.clone().add(this.phaserStore.phaser.camera.width / 2, this.phaserStore.phaser.camera.height / 2);
      const flingPosition = cameraCenter.subtract(this.scrollVelocity.x, this.scrollVelocity.y);
      this.phaserStore.tweenCamera(flingPosition.x, flingPosition.y);
    }

    this.phaserStore.phaser.input.deleteMoveCallback(this.onScroll, this);
    this.phaserStore.phaser.input.onUp.remove(this.onScrollEnd, this);
  }
}
