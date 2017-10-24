import { observable, action, computed } from 'mobx';
import * as Phaser from 'phaser-ce';

import RootStore from 'game/stores';
import TerritoryView from 'game/phaser/territory';
import EdgeView from 'game/phaser/edge';
import UnitView from 'game/phaser/unit';

import { ID } from 'models/utils';
import Unit from 'models/unit';
import Territory from 'models/territory';
import { TerritoryTypeCheckOrder, Colour } from 'models/values';
import {
  TerritoryAssetStrings,
  TERRITORY_ASSET_PREFIX,
  TERRITORY_ASSET_BACKDROP_SUFFIX,
  ASSET_PATH,
} from 'game/constants';

export default class PhaserStore {
  @observable.ref phaser: Phaser.Game = null;
  territoryViews: Map<ID, TerritoryView> = new Map();
  edgeViews: Map<ID, EdgeView> = new Map();
  unitViews: Map<ID, UnitView> = new Map();

  @action
  destroyUnit(unitId: ID) {
    const unitView = this.unitViews.get(unitId);
    if (unitView) unitView.destroy();
  }

  @action
  setPhaser(phaser: Phaser.Game) {
    this.phaser = phaser;
  }

  @action
  initialise(window: Window, divId: string) {
    const self = this;

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

      self.setPhaser(phaser);
    }

    function update() {}
  }

  @action
  initialiseViews(stores: RootStore, territoryPositions: Array<{ x: number; y: number }>) {
    for (let i = 0; i < stores.gameStore.map.territories.length; ++i) {
      const territoryId = stores.gameStore.map.territories[i].data.id;
      stores.phaserStore.territoryViews.set(
        territoryId,
        new TerritoryView(
          stores.phaserStore,
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
      stores.phaserStore.edgeViews.set(edgeId, new EdgeView(stores.phaserStore, stores.gameStore, edgeId));
    }

    for (let unit of stores.gameStore.map.units) {
      const unitId = unit.data.id;
      stores.phaserStore.unitViews.set(
        unitId,
        new UnitView(stores.phaserStore, stores.gameStore, stores.uiStore, unitId)
      );
    }
  }
}
