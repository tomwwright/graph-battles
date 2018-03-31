import { observable, action, computed, when, autorun } from 'mobx';
import * as Phaser from 'phaser-ce';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';
import TerritoryView from 'game/phaser/territory';
import EdgeView from 'game/phaser/edge';
import UnitView from 'game/phaser/unit';
import KineticScroller from 'game/phaser/kineticScroller';

import { ID, sum, contains } from 'models/utils';
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

  cameraTween: Phaser.Tween;

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

        const kineticScroller = new KineticScroller(this);
        this.phaser.world.add(kineticScroller.sprite);

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

        this.centreCamera();

        autorun(() => this.initialiseUnitViews());
      }
    )
  }

  @action
  centreCamera(): Promise<{}> {
    if (this.gameStore.map.data.territoryIds.length == 0)
      throw new Error('No territories exist, cannot centre camera!');
    return this.focusOn(this.gameStore.map.data.territoryIds);
  }

  @action
  focusOn(ids: ID[]): Promise<{}> {
    if (ids.length == 0) {
      this.centreCamera();
      return;
    }

    const positions: Phaser.Point[] = [];
    ids.forEach(id => {
      if (this.territoryViews.get(id))
        positions.push(this.territoryViews.get(id).spriteGroup.position);
      else if (this.edgeViews.get(id))
        positions.push(this.edgeViews.get(id).sprite.position);
      else if (this.unitViews.get(id))
        positions.push(this.unitViews.get(id).spriteGroup.position);
    });

    const x = sum(positions.map(position => position.x)) / positions.length;
    const y = sum(positions.map(position => position.y)) / positions.length;

    return this.tweenCamera(x, y);
  }

  @action
  tweenCamera(x: number, y: number): Promise<{}> {
    if (this.cameraTween) {
      this.cameraTween.stop();
    }
    const promise = new Promise((resolve, reject) => {
      const centreX = x - this.phaser.camera.width / 2;
      const centreY = y - this.phaser.camera.height / 2;
      this.cameraTween = this.phaser.add.tween(this.phaser.camera).to({ x: centreX, y: centreY }, 500, Phaser.Easing.Quadratic.Out);
      this.cameraTween.onComplete.add(() => {
        this.cameraTween = null;
        resolve();
      });
      this.cameraTween.start();
    });
    return promise;
  }

  @action
  setCamera(x: number, y: number) {
    if (this.cameraTween) {
      this.cameraTween.stop();
      this.cameraTween = null;
    }
    this.phaser.camera.x = x - this.phaser.camera.width / 2;
    this.phaser.camera.y = y - this.phaser.camera.height / 2;
  }


  private initialiseUnitViews() {

    this.unitViews.forEach((unitView: UnitView, id: ID) => {
      if (!contains(this.gameStore.map.data.unitIds, unitView.modelId)) {
        this.unitViews.delete(unitView.modelId);
        unitView.destroy();
      }
    });

    this.gameStore.map.data.unitIds.forEach(unitId => {
      const unitView = this.unitViews.get(unitId);
      if (!unitView) {
        this.unitViews.set(
          unitId,
          new UnitView(this, this.gameStore, this.uiStore, unitId)
        );
      }
    });

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
      phaser.stage.disableVisibilityChange = true;
      phaser.camera.bounds = null;

      self.setPhaser(phaser);
    }

    function update() { }
  }
}
