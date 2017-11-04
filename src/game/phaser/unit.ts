import { autorun, IReactionDisposer } from 'mobx';
import * as Phaser from 'phaser-ce';

import PhaserStore from 'game/stores/phaser';
import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';
import { StatusDefinitions, SELECTED_ALPHA, UNITS_PER_ROW, UNITS_SPACING } from 'game/constants';

import { ID } from 'models/utils';
import Unit from 'models/unit';
import { Colour } from 'models/values';

export default class UnitView {
  modelId: ID;
  gameStore: GameStore;
  phaserStore: PhaserStore;
  uiStore: UiStore;

  spriteGroup: Phaser.Group;
  sprite: Phaser.Image;
  spriteBackdrop: Phaser.Image;
  spriteLine: Phaser.Image;
  spriteArrow: Phaser.Image;
  spriteStatusesGroup: Phaser.Group;
  spriteStatuses: Phaser.Image[] = [];

  disposeStatusAutorun: IReactionDisposer;
  disposeVisibilityAutorun: IReactionDisposer;
  disposePositionAutorun: IReactionDisposer;
  disposeDestinationAutorun: IReactionDisposer;
  disposeControllerAutorun: IReactionDisposer;
  disposeSelectedAutorun: IReactionDisposer;

  constructor(phaserStore: PhaserStore, gameStore: GameStore, uiStore: UiStore, modelId: string) {
    this.modelId = modelId;
    this.gameStore = gameStore;
    this.uiStore = uiStore;
    this.phaserStore = phaserStore;

    this.initialiseSprites();
    this.initialiseSpriteEvents();
    this.initialiseAutoruns();
  }

  findModel(): Unit {
    return this.gameStore.map.units.find(unit => unit.data.id === this.modelId);
  }

  initialiseSprites() {
    this.sprite = new Phaser.Image(this.phaserStore.phaser, 0, 0, 'units', 0);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.setTo(3);
    this.sprite.smoothed = false;

    this.spriteBackdrop = new Phaser.Image(this.phaserStore.phaser, 0, 0, 'units', 4);
    this.spriteBackdrop.anchor.set(0.5);
    this.spriteBackdrop.scale.setTo(3 * 1.1);
    this.spriteBackdrop.smoothed = false;

    this.spriteLine = new Phaser.Image(this.phaserStore.phaser, 0, 0, 'line');
    this.spriteLine.anchor.set(0, 0.5);
    this.spriteLine.exists = false;

    this.spriteArrow = new Phaser.Image(this.phaserStore.phaser, 0, 0, 'marker');
    this.spriteArrow.anchor.set(0.5);
    this.spriteArrow.exists = false;

    this.spriteStatusesGroup = this.phaserStore.phaser.add.group();
    this.spriteStatusesGroup.x = -this.sprite.width / 2;
    this.spriteStatusesGroup.y = this.sprite.height / 2;

    this.spriteGroup = this.phaserStore.phaser.add.group();
    this.spriteGroup.add(this.spriteLine);
    this.spriteGroup.add(this.spriteArrow);
    this.spriteGroup.add(this.spriteBackdrop);
    this.spriteGroup.add(this.sprite);
    this.spriteGroup.add(this.spriteStatusesGroup);
  }

  initialiseSpriteEvents() {
    this.sprite.inputEnabled = true;
    const self = this;
    this.sprite.events.onInputUp.add((obj: Phaser.Image, pointer: Phaser.Pointer) => {
      self.uiStore.onClickUnit(self.modelId);
    });
  }

  initialiseAutoruns() {
    this.disposeStatusAutorun = autorun(this.onUpdateStatuses.bind(this));
    this.disposeVisibilityAutorun = autorun(this.onUpdateVisibility.bind(this));
    this.disposePositionAutorun = autorun(this.onUpdatePosition.bind(this));
    this.disposeDestinationAutorun = autorun(this.onUpdateDestinationLine.bind(this));
    this.disposeControllerAutorun = autorun(this.onUpdateController.bind(this));
    this.disposeSelectedAutorun = autorun(this.onUpdateSelected.bind(this));
  }

  onUpdateStatuses() {
    const model = this.findModel();

    this.spriteStatusesGroup.removeAll();
    if (model.data.statuses.length > 0) {
      let x = 0;
      for (let status of model.data.statuses) {
        let statusDef = StatusDefinitions[status];
        let statusSprite = new Phaser.Image(this.phaserStore.phaser, x, 0, statusDef.assetString);
        statusSprite.anchor.set(0.5);
        x += 16;
        this.spriteStatusesGroup.add(statusSprite);
      }
    }
  }

  onUpdateVisibility() {
    const model = this.findModel();
    this.spriteGroup.visible = this.gameStore.visibility.get(model.location.data.id);
  }

  onUpdateDestinationLine() {
    const model = this.findModel();
    const playerIsActive = model.data.playerId && model.data.playerId === this.gameStore.currentPlayerId;

    if (model.destination && playerIsActive) {
      const destinationView = this.phaserStore.territoryViews.get(model.destination.data.id);

      const destPos = destinationView.spriteGroup.position;
      const unitPos = this.spriteGroup.position;
      const positionOffset = destPos.clone().subtract(unitPos.x, unitPos.y);
      const angle = new Phaser.Point().angle(positionOffset);
      const dist = positionOffset.getMagnitude() - destinationView.sprite.width * 0.4; // offset from centre of destination by 40% of territory sprite width
      positionOffset.normalize().multiply(dist, dist); // rescale position offset to new dist

      this.spriteLine.width = dist;
      this.spriteLine.angle = Phaser.Math.radToDeg(angle);

      this.spriteArrow.angle = this.spriteLine.angle;
      this.spriteArrow.position.set(positionOffset.x, positionOffset.y);

      this.spriteLine.exists = true;
      this.spriteArrow.exists = true;
    } else {
      this.spriteLine.exists = false;
      this.spriteArrow.exists = false;
    }
  }

  onUpdatePosition() {
    const model = this.findModel();

    let rootPosition: Phaser.Point;
    const territoryView = this.phaserStore.territoryViews.get(model.data.locationId);
    if (territoryView) {
      rootPosition = territoryView.spriteGroup.position;
    } else {
      const edgeView = this.phaserStore.edgeViews.get(model.data.locationId);
      rootPosition = edgeView.sprite.position;
    }

    const numUnits = model.location.units.length,
      numRows = Math.ceil(numUnits / UNITS_PER_ROW),
      numCols = Math.min(numUnits, UNITS_PER_ROW),
      index = model.location.units.findIndex(unit => unit.data.id === model.data.id),
      row = Math.floor(index / UNITS_PER_ROW),
      col = index % UNITS_PER_ROW,
      totalWidth = (numCols - 1) * this.sprite.width * (1 + UNITS_SPACING),
      totalHeight = (numRows - 1) * this.sprite.height * (1 + UNITS_SPACING),
      x = col * this.sprite.width * (1 + UNITS_SPACING),
      y = row * this.sprite.height * (1 + UNITS_SPACING);

    this.spriteGroup.x = rootPosition.x + x - totalWidth * 0.5;
    this.spriteGroup.y = rootPosition.y + y - totalHeight * 0.5;

    this.onUpdateDestinationLine();
  }

  onUpdateController() {
    const model = this.findModel();

    const colour = model.player ? model.player.data.colour : Colour.WHITE;
    this.spriteBackdrop.tint = colour;
    this.spriteLine.tint = colour;
    this.spriteArrow.tint = colour;
  }

  onUpdateSelected() {
    this.sprite.alpha =
      this.uiStore.selected &&
        this.uiStore.selected.type === 'unit' &&
        this.uiStore.selected.ids.indexOf(this.modelId) != -1
        ? SELECTED_ALPHA
        : 1;
  }

  destroy() {
    this.disposeStatusAutorun();
    this.disposeControllerAutorun();
    this.disposeDestinationAutorun();
    this.disposePositionAutorun();
    this.disposeSelectedAutorun();
    this.disposeVisibilityAutorun();

    this.spriteGroup.destroy();
  }
}
