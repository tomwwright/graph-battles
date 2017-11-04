import { observable, action, computed, when, autorun } from 'mobx';
import * as Phaser from 'phaser-ce';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';
import TerritoryView from 'game/phaser/territory';
import EdgeView from 'game/phaser/edge';
import UnitView from 'game/phaser/unit';

import { ID } from 'models/utils';
import { GameMapData } from 'models/map';
import { TerritoryTypeCheckOrder, Colour } from 'models/values';
import {
  TerritoryAssetStrings,
  TERRITORY_ASSET_PREFIX,
  TERRITORY_ASSET_BACKDROP_SUFFIX,
  ASSET_PATH,
} from 'game/constants';

type TerritoryViewData = {
  position: {
    x: number;
    y: number;
  }
};
export type ViewData = { [id: string]: TerritoryViewData };

export default class PhaserStore {
  @observable.ref phaser: Phaser.Game = null;
  territoryViews: Map<ID, TerritoryView> = new Map();
  edgeViews: Map<ID, EdgeView> = new Map();
  unitViews: Map<ID, UnitView> = new Map();

  gameStore: GameStore;
  uiStore: UiStore;

  @action
  setPhaser(phaser: Phaser.Game) {
    this.phaser = phaser;
  }

  @action
  initialise(window: Window, divId: string, gameStore: GameStore, uiStore: UiStore, viewData: ViewData) {
    this.gameStore = gameStore;
    this.uiStore = uiStore;

    this.initialisePhaser(window, divId);

    when(
      () => this.gameStore.map !== null,
      () => {
        for (const territoryId of this.gameStore.map.data.territoryIds) {
          this.territoryViews.set(
            territoryId,
            new TerritoryView(
              this,
              this.gameStore,
              this.uiStore,
              territoryId,
              viewData[territoryId].position.x,
              viewData[territoryId].position.y
            )
          );
        }

        for (const edgeId of this.gameStore.map.data.edgeIds) {
          this.edgeViews.set(edgeId, new EdgeView(this, this.gameStore, edgeId));
        }

        autorun(() => {
          this.unitViews.forEach((unitView: UnitView, id: ID) => unitView.destroy());
          for (const unitId of this.gameStore.map.data.unitIds)
            this.unitViews.set(
              unitId,
              new UnitView(this, this.gameStore, this.uiStore, unitId)
            );
        });
      }
    )
  }

  @action
  private initialisePhaser(window: Window, divId: string) {
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

    function update() { }
  }
}
