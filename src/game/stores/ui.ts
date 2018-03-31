import { observable, observe, action, computed, runInAction } from 'mobx';

import GameStore, { ResolveState, VisibilityMode } from 'game/stores/game';
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

export const enum TurnState {
  NEXT_PLAYER = "next-player",
  REPLAYING = "replaying",
  PLANNING = "planning"
};

export default class UiStore {

  gameStore: GameStore;
  phaserStore: PhaserStore;

  @observable selected: Selected;
  @observable turnState: TurnState = TurnState.NEXT_PLAYER;

  @observable isResolving = false;

  constructor(gameStore: GameStore, phaserStore: PhaserStore) {
    this.gameStore = gameStore;
    this.phaserStore = phaserStore;
  }

  @computed
  get displayOpposingMovement() {
    return this.gameStore.turn < this.gameStore.game.turn;
  }

  @computed
  get displayOpposingTerritoryAction() {
    return this.gameStore.turn < this.gameStore.game.turn;
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

    if (!this.selected || this.selected.type === 'territory' || this.gameStore.isReplaying || this.validDestinationIds.indexOf(territoryId) === -1) {
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
  onClickNextPlayerGo() {
    this.gameStore.setVisibility(VisibilityMode.CURRENT_PLAYER);
    this.setTurn(Math.max(1, this.gameStore.turn - 1));
  }

  @action
  onClickReady() {
    const playerIds = this.gameStore.map.data.playerIds;
    const currentPlayerIdx = playerIds.indexOf(this.gameStore.currentPlayerId);
    if (currentPlayerIdx < playerIds.length - 1) {
      this.gameStore.setCurrentPlayer(playerIds[currentPlayerIdx + 1]);
    } else {
      this.gameStore.resolveTurn();
      this.setTurn(this.gameStore.turn + 1);
      this.gameStore.setCurrentPlayer(playerIds[0]);
    }
    this.gameStore.setVisibility(VisibilityMode.NOT_VISIBLE);
    this.unselect();
    this.turnState = TurnState.NEXT_PLAYER;
  }

  @action
  setPlayer(playerId: ID) {
    this.gameStore.setCurrentPlayer(playerId);
    this.unselect();
    this.turnState = TurnState.NEXT_PLAYER;
  }

  @action
  setTurn(turn: number) {
    if (turn < 1 || turn > this.gameStore.game.data.maps.length)
      throw new Error(`Invalid turn number: ${turn}`);
    this.gameStore.setTurn(turn);
    this.unselect();
    this.turnState = this.gameStore.isReplaying ? TurnState.REPLAYING : TurnState.PLANNING;
  }

  @action
  selectTerritory(territoryId: ID) {
    const territoryAlreadySelected = this.selected && this.selected.type === 'territory' && this.selected.id === territoryId;
    if (territoryAlreadySelected) {
      this.selected = null;
    } else {
      this.selected = {
        type: 'territory',
        id: territoryId,
      };
    }
  }

  @action
  selectUnits(unitIds: ID[]) {
    if (unitIds.length == 0) {
      this.selected = null;
    } else {
      this.selected = {
        type: 'unit',
        ids: unitIds
      };
    }
  }

  @action
  unselect() { this.selected = null; }

  @action
  onClickResolve(id: ID) {
    if (this.isResolving) {
      return;
    }
    const focusIds = (this.gameStore.resolveState === ResolveState.GOLD) ? this.gameStore.map.data.territoryIds : [id];
    this.isResolving = true;
    this.phaserStore.focusOn(focusIds).then(() => {
      runInAction(() => {
        this.gameStore.resolve(id);
        this.isResolving = false;

        if (this.gameStore.resolveState == ResolveState.NONE) {
          this.setTurn(this.gameStore.turn + 1);
        }
      })
    });
  }
}
