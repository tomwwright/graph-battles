import { observable, observe, action, computed } from 'mobx';

import GameStore from 'game/stores/game';
import PhaserStore from 'game/stores/phaser';
import { ID, intersection, include, exclude, flat, clone } from 'models/utils';
import Territory from 'models/territory';

type Selected =
  | null
  | {
    type: 'territory';
    id: ID;
  }
  | {
    type: 'unit';
    ids: ID[];
  };

export default class UiStore {

  gameStore: GameStore;
  phaserStore: PhaserStore;

  @observable selected: Selected;
  @observable turn: number;

  constructor(gameStore: GameStore, phaserStore: PhaserStore) {
    this.gameStore = gameStore;
    this.phaserStore = phaserStore;
  }

  @computed
  get validDestinationIds() {
    if (!this.selected || this.selected.type !== 'unit') return [];

    const units = this.selected.ids.map(id => this.gameStore.map.unit(id));

    if (units.length > 0 && units[0].data.playerId != this.gameStore.currentPlayerId) return [];

    const destinationIds = intersection(
      ...units.map(unit =>
        (unit.location as Territory).edges.map(edge => edge.other(unit.location as Territory).data.id)
      )
    );

    return destinationIds;
  }

  @action
  onClickTerritory(territoryId: ID) {
    if (!this.selected || this.selected.type === 'territory' || this.validDestinationIds.indexOf(territoryId) === -1) {
      this.selectTerritory(territoryId);
    } else if (this.selected.type === 'unit') {
      this.gameStore.onMoveUnits(this.selected.ids, territoryId);
      this.unselect();
    } else {
      throw new Error('Bad state in UI Store');
    }
  }

  @action
  onClickUnit(unitId: ID) {
    if (!this.selected || this.selected.type !== 'unit') {
      this.selectUnits([unitId]);
    } else {
      const selectedUnitsPlayer = this.gameStore.map.unit(this.selected.ids[0]).data.playerId;
      const clickedUnitPlayer = this.gameStore.map.unit(unitId).data.playerId;
      if (selectedUnitsPlayer !== clickedUnitPlayer) {
        this.selectUnits([unitId]);
      } else if (this.selected.ids.indexOf(unitId) === -1) {
        this.selectUnits(include(this.selected.ids, unitId));
      } else {
        this.selectUnits(exclude(this.selected.ids, unitId));
      }
    }
  }

  @action
  setTurn(turn: number) {
    if (turn < 1 || turn > this.gameStore.game.data.maps.length)
      throw new Error(`Invalid turn number: ${turn}`);
    this.gameStore.setMap(clone(this.gameStore.game.data.maps[turn - 1]));
    this.turn = turn;
  }

  @action
  selectTerritory(territoryId: ID) {
    const territoryAlreadySelected = this.selected && this.selected.type === 'territory' && this.selected.id === territoryId;
    this.selected = territoryAlreadySelected ? null : {
      type: 'territory',
      id: territoryId,
    };
  }

  @action
  selectUnits(unitIds: ID[]) {
    this.selected = unitIds.length == 0 ? null : {
      type: 'unit',
      ids: unitIds
    };
  }

  @action
  unselect() { this.selected = null; }

}
