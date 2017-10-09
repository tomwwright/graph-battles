import { autorun } from "mobx";

import GameStore from "game/stores/game";
import UiStore from "game/stores/ui";
import { StatusDefinitions, SELECTED_ALPHA, UNITS_PER_ROW, UNITS_SPACING } from "game/constants";

import { ID } from "models/utils";
import { Unit } from "models/unit";
import { Colour } from "models/values";

export default class UnitView {
  modelId: ID;
  gameStore: GameStore;
  uiStore: UiStore;

  phaser: Phaser.Game;
  spriteGroup: Phaser.Group;
  sprite: Phaser.Image;
  spriteBackdrop: Phaser.Image;
  spriteLine: Phaser.Image;
  spriteArrow: Phaser.Image;
  spriteStatusesGroup: Phaser.Group;
  spriteStatuses: Phaser.Image[] = [];

  constructor(phaser: Phaser.Game, gameStore: GameStore, uiStore: UiStore, modelId: string) {
    this.modelId = modelId;
    this.gameStore = gameStore;
    this.uiStore = uiStore;
    this.phaser = phaser;

    this.initialiseSprites();
    this.initialiseSpriteEvents();
    this.initialiseAutoruns();
  }

  findModel(): Unit {
    return this.gameStore.map.units.find(unit => unit.data.id === this.modelId);
  }

  initialiseSprites() {
    this.sprite = new Phaser.Image(this.phaser, 0, 0, "units", 0);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.setTo(3);
    this.sprite.smoothed = false;

    this.spriteBackdrop = new Phaser.Image(this.phaser, 0, 0, "units", 4);
    this.spriteBackdrop.anchor.set(0.5);
    this.spriteBackdrop.scale.setTo(3 * 1.1);
    this.spriteBackdrop.smoothed = false;

    this.spriteLine = new Phaser.Image(this.phaser, 0, 0, "line");
    this.spriteLine.anchor.set(0, 0.5);
    this.spriteLine.exists = false;

    this.spriteArrow = new Phaser.Image(this.phaser, 0, 0, "marker");
    this.spriteArrow.anchor.set(0.5);
    this.spriteArrow.exists = false;

    this.spriteStatusesGroup = this.phaser.add.group();
    this.spriteStatusesGroup.x = -this.sprite.width / 2;
    this.spriteStatusesGroup.y = this.sprite.height / 2;

    this.spriteGroup = this.phaser.add.group();
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
      self.uiStore.selectUnit(obj.data.modelId);
    });
    this.sprite.data.modelId = this.modelId;
  }

  initialiseAutoruns() {
    autorun(this.onUpdateStatuses.bind(this));
    autorun(this.onUpdateVisibility.bind(this));
    autorun(this.onUpdatePosition.bind(this));
    autorun(this.onUpdateDestinationLine.bind(this));
    autorun(this.onUpdateController.bind(this));
    autorun(this.onUpdateSelected.bind(this));
  }

  onUpdateStatuses() {
    const model = this.findModel();

    this.spriteStatusesGroup.removeAll();
    if (model.data.statuses.length > 0) {
      let x = 0;
      for (let status of model.data.statuses) {
        let statusDef = StatusDefinitions[status];
        let statusSprite = new Phaser.Image(this.phaser, x, 0, statusDef.assetString);
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

    if (model.destination) {
      const destinationView = this.uiStore.territoryViews.get(model.destination.data.id);

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
    const territoryView = this.uiStore.territoryViews.get(model.data.locationId);
    if (territoryView) {
      rootPosition = territoryView.spriteGroup.position;
    } else {
      const edgeView = this.uiStore.edgeViews.get(model.data.locationId);
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
      this.uiStore.selectedType == "unit" && this.uiStore.selectedId == this.modelId ? SELECTED_ALPHA : 1;
  }
}
