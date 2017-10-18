import * as Phaser from 'phaser-ce';

import RootStore from 'game/stores';
import TerritoryView from 'game/phaser/territory';
import EdgeView from 'game/phaser/edge';
import UnitView from 'game/phaser/unit';

import GameMap from 'models/map';
import { TerritoryTypeCheckOrder, Colour } from 'models/values';
import { TerritoryAssetStrings, TERRITORY_ASSET_PREFIX, TERRITORY_ASSET_BACKDROP_SUFFIX } from 'game/constants';

export const ASSET_PATH = '/assets/';

export function initialisePhaser(window: Window, divId: string, store: RootStore) {
  const phaser = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, divId, {
    preload,
    create,
    update,
  });

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
    phaser.load.image('line', ASSET_PATH + 'line.png');
    phaser.load.spritesheet('units', ASSET_PATH + 'armies.png', 16, 16);
    phaser.load.image('status-defend', ASSET_PATH + 'status-defend.png');
    phaser.load.image('status-starve', ASSET_PATH + 'status-starve.png');
    phaser.load.image('territory-action', ASSET_PATH + 'territory-action.png');
    phaser.load.image('arrow', ASSET_PATH + 'arrow.png');
    phaser.load.image('marker', ASSET_PATH + 'marker.png');

    for (let type of TerritoryTypeCheckOrder) {
      let assetString = TerritoryAssetStrings[type];
      phaser.load.image(
        TERRITORY_ASSET_PREFIX + assetString,
        ASSET_PATH + 'territories/territory-' + assetString + '.png'
      );
      phaser.load.image(
        TERRITORY_ASSET_PREFIX + assetString + TERRITORY_ASSET_BACKDROP_SUFFIX,
        ASSET_PATH + 'territories/territory-' + assetString + '-backdrop.png'
      );
    }
  }

  function create() {
    phaser.stage.backgroundColor = Colour.BLACK;

    store.uiStore.phaser = phaser;
    store.uiStore.isPhaserInitialised = true;
  }

  function update() {}
}

export function initialiseViews(stores: RootStore, territoryPositions: Array<{ x: number; y: number }>) {
  for (let i = 0; i < stores.gameStore.map.territories.length; ++i) {
    const territoryId = stores.gameStore.map.territories[i].data.id;
    stores.uiStore.territoryViews.set(
      territoryId,
      new TerritoryView(
        stores.uiStore.phaser,
        stores.gameStore,
        stores.uiStore,
        territoryId,
        territoryPositions[i].x,
        territoryPositions[i].y
      )
    );
  }

  for (let edge of stores.gameStore.map.edges) {
    const edgeId = edge.data.id;
    stores.uiStore.edgeViews.set(edgeId, new EdgeView(stores.uiStore.phaser, stores, edgeId));
  }

  for (let unit of stores.gameStore.map.units) {
    const unitId = unit.data.id;
    stores.uiStore.unitViews.set(unitId, new UnitView(stores.uiStore.phaser, stores.gameStore, stores.uiStore, unitId));
  }
}
