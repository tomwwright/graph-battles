import { observable, action, computed } from 'mobx';
import * as Phaser from 'phaser-ce';

import TerritoryView from 'game/phaser/territory';
import EdgeView from 'game/phaser/edge';
import UnitView from 'game/phaser/unit';

import { ID } from 'models/utils';
import Unit from 'models/unit';
import Territory from 'models/territory';

export default class PhaserStore {
  @observable isInitialised: boolean = false;

  phaser: Phaser.Game;
  territoryViews: Map<ID, TerritoryView> = new Map();
  edgeViews: Map<ID, EdgeView> = new Map();
  unitViews: Map<ID, UnitView> = new Map();

  @action
  destroyUnit(unitId: ID) {
    const unitView = this.unitViews.get(unitId);
    if (unitView) unitView.destroy();
  }
}
