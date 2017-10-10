import { observable, action } from "mobx";
import * as Phaser from "phaser-ce";
import GameStore from "game/stores/game";
import TerritoryView from "game/phaser/territory";
import EdgeView from "game/phaser/edge";
import UnitView from "game/phaser/unit";

import { ID } from "models/utils";
import { Unit } from "models/unit";

type Selected =
  | null
  | {
      type: "territory";
      id: ID;
    }
  | {
      type: "unit";
      ids: ID[];
    };

export default class UiStore {
  @observable selected: Selected;
  @observable isPhaserInitialised: boolean = false;
  @observable turn: number = 1;

  game: GameStore;
  phaser: Phaser.Game;
  territoryViews: Map<ID, TerritoryView> = new Map();
  edgeViews: Map<ID, EdgeView> = new Map();
  unitViews: Map<ID, UnitView> = new Map();

  constructor(game: GameStore) {
    this.game = game;
  }

  @action
  selectTerritory(territoryId: ID) {
    if (this.selected && this.selected.type === "territory" && this.selected.id === territoryId) {
      this.selected = null;
    } else {
      this.selected = {
        type: "territory",
        id: territoryId
      };
    }
  }

  @action
  selectUnit(unitId: ID) {
    if (!this.selected || this.selected.type === "territory") {
      this.selected = {
        type: "unit",
        ids: [unitId]
      };
    } else if (this.selected.ids.indexOf(unitId) > -1) {
      this.selected.ids.splice(this.selected.ids.indexOf(unitId), 1);
    } else if (
      this.selected.ids.length == 0 ||
      this.game.map.unit(unitId).location.data.id === this.game.map.unit(this.selected.ids[0]).location.data.id
    ) {
      this.selected.ids.push(unitId);
    } else {
      this.selected.ids = [unitId];
    }
  }
}
