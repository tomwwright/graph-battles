import * as Phaser from "phaser-ce";

import UiStore from "game/stores/uiStore";

import { TerritoryTypeCheckOrder, Colour } from "models/values";
import { TerritoryAssetStrings } from "game/constants";

const ASSET_PATH = "/assets/";
const TERRITORY_ASSET_PREFIX: string = "territory-";
const TERRITORY_ASSET_BACKDROP_SUFFIX: string = "-backdrop";

export function initialisePhaser(window: Window, divId: string, store: UiStore) {
  const phaser = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, divId, { preload, create });

  window.onresize = () => {
    let width = window.innerWidth;
    let height = window.innerHeight;
    phaser.width = width;
    phaser.height = height;
    phaser.stage.getBounds().width = width;
    phaser.stage.getBounds().height = height;
    if (phaser.renderType === Phaser.WEBGL) {
      phaser.renderer.resize(width, height);
    }
  };

  function preload() {
    phaser.load.image("line", ASSET_PATH + "line.png");
    phaser.load.spritesheet("units", ASSET_PATH + "armies.png", 16, 16);
    phaser.load.image("status-defend", ASSET_PATH + "status-defend.png");
    phaser.load.image("status-starve", ASSET_PATH + "status-starve.png");
    phaser.load.image("territory-action", ASSET_PATH + "territory-action.png");
    phaser.load.image("arrow", ASSET_PATH + "arrow.png");

    for (let type of TerritoryTypeCheckOrder) {
      let assetString = TerritoryAssetStrings[type];
      this.load.image(
        TERRITORY_ASSET_PREFIX + assetString,
        ASSET_PATH + "territories/territory-" + assetString + ".png"
      );
      this.load.image(
        TERRITORY_ASSET_PREFIX + assetString + TERRITORY_ASSET_BACKDROP_SUFFIX,
        ASSET_PATH + "territories/territory-" + assetString + "-backdrop.png"
      );
    }
  }

  function create() {
    phaser.stage.backgroundColor = Colour.BLACK;
    store.isPhaserInitialised = true;
  }
}
