import { autorun } from "mobx";
import Territory from "models/territory";
import { ID } from "models/utils";
import GameStore from "game/stores/game";
import UiStore from "game/stores/ui";
import {
  TerritoryAssetStrings,
  TERRITORY_ASSET_PREFIX,
  TERRITORY_ASSET_BACKDROP_SUFFIX,
  TERRITORY_VISIBILITY_OVERLAY_ALPHA,
  SELECTED_ALPHA
} from "game/constants";

import { Colour } from "models/values";

export default class TerritoryView {
  modelId: ID;
  gameStore: GameStore;
  uiStore: UiStore;

  phaser: Phaser.Game;
  sprite: Phaser.Image;
  spriteBackdrop: Phaser.Image;
  spriteOverlay: Phaser.Image;
  spriteActionIndicator: Phaser.Image;
  spriteGroup: Phaser.Group;

  constructor(phaser: Phaser.Game, gameStore: GameStore, uiStore: UiStore, modelId: string, x: number, y: number) {
    this.modelId = modelId;
    this.phaser = phaser;
    this.gameStore = gameStore;
    this.uiStore = uiStore;

    this.initialiseSprites(x, y);
    this.initialiseSpriteEvents();
    this.initialiseAutoruns();
  }

  findModel(): Territory {
    return this.gameStore.map.territories.find(territory => territory.data.id === this.modelId);
  }

  initialiseSprites(x: number, y: number) {
    this.spriteGroup = this.phaser.add.group();
    this.spriteGroup.x = x;
    this.spriteGroup.y = y;

    this.sprite = new Phaser.Image(this.phaser, 0, 0, "territory-unsettled");
    this.sprite.anchor.set(0.5);

    this.spriteBackdrop = new Phaser.Image(this.phaser, 0, 0, "territory-unsettled-backdrop");
    this.spriteBackdrop.scale.setTo(1.05);
    this.spriteBackdrop.anchor.set(0.5);

    this.spriteOverlay = new Phaser.Image(this.phaser, 0, 0, "territory-unsettled-backdrop");
    this.spriteOverlay.scale.setTo(1.05);
    this.spriteOverlay.anchor.set(0.5);
    this.spriteOverlay.tint = 0x555555;
    this.spriteOverlay.alpha = 0;

    this.spriteActionIndicator = new Phaser.Image(
      this.phaser,
      -this.sprite.width * 0.3,
      this.sprite.height * 0.35,
      "territory-action"
    );
    this.spriteActionIndicator.anchor.set(0.5);
    this.spriteActionIndicator.visible = false;

    this.spriteGroup.add(this.spriteBackdrop);
    this.spriteGroup.add(this.sprite);
    this.spriteGroup.add(this.spriteActionIndicator);
    this.spriteGroup.add(this.spriteOverlay);
  }

  initialiseSpriteEvents() {
    this.sprite.inputEnabled = true;
    this.sprite.input.pixelPerfectOver = true;
    this.sprite.input.enabled = true;

    const self = this;
    this.sprite.events.onInputUp.add((obj: Phaser.Image, pointer: Phaser.Pointer) => {
      self.uiStore.selectTerritory(obj.data.modelId);
    });
    this.sprite.data.modelId = this.modelId;
  }

  initialiseAutoruns() {
    autorun(this.onUpdateSelected.bind(this));
    autorun(this.onUpdateVisibility.bind(this));
    autorun(this.onUpdateActionIndicator.bind(this));
    autorun(this.onUpdateTerritorySprite.bind(this));
    autorun(this.onUpdateTerritoryController.bind(this));
  }

  onUpdateSelected() {
    this.sprite.alpha =
      (this.uiStore.selected &&
        this.uiStore.selected.type === "territory" &&
        this.uiStore.selected.id === this.modelId) ||
      this.uiStore.validDestinationIds.find(destinationId => destinationId === this.modelId)
        ? SELECTED_ALPHA
        : 1;
  }

  onUpdateVisibility() {
    this.spriteOverlay.alpha = this.gameStore.visibility.get(this.modelId) ? 0 : TERRITORY_VISIBILITY_OVERLAY_ALPHA;
  }

  onUpdateActionIndicator() {
    const model = this.findModel();
    this.spriteActionIndicator.visible =
      this.gameStore.visibility.get(model.data.id) && model.data.currentAction != null;
  }

  onUpdateTerritorySprite() {
    const model = this.findModel();
    const assetString = TerritoryAssetStrings[model.data.type];
    this.sprite.loadTexture(TERRITORY_ASSET_PREFIX + assetString);
    this.spriteBackdrop.loadTexture(TERRITORY_ASSET_PREFIX + assetString + TERRITORY_ASSET_BACKDROP_SUFFIX);
    this.spriteOverlay.loadTexture(TERRITORY_ASSET_PREFIX + assetString + TERRITORY_ASSET_BACKDROP_SUFFIX);
  }

  onUpdateTerritoryController() {
    const model = this.findModel();
    const colour = model.player ? model.player.data.colour : Colour.WHITE;
    this.spriteBackdrop.tint = colour;
  }
}
