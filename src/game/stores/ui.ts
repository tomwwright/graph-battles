import { observable, observe, action, computed } from 'mobx';

import GameStore, { VisibilityMode } from 'game/stores/game';
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
  NEXT_PLAYER = 'next-player',
  MOVE = 'move',
  COMBAT = 'combat',
  POST_REPLAY = 'post-replay',
  PLAN = 'plan'
};

export default class UiStore {

  gameStore: GameStore;
  phaserStore: PhaserStore;

  @observable selected: Selected;
  @observable turnState: TurnState = TurnState.NEXT_PLAYER;

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
  onClickNextPlayerGo() {
    this.setTurn(Math.max(1, this.gameStore.turn - 1));
  }

  @action
  onClickResolveMoves() {
    this.gameStore.resolveMoves();
    if (this.gameStore.combats.length == 0)
      this.turnState = TurnState.POST_REPLAY;
    else
      this.turnState = TurnState.COMBAT;
  }

  @action
  onClickResolveCombat(locationId: ID) {
    this.gameStore.resolveCombat(locationId);
    if (this.gameStore.combats.length == 0) {
      if (this.gameStore.map.units.some(unit => unit.data.destinationId != null))
        this.turnState = TurnState.MOVE;
      else
        this.turnState = TurnState.POST_REPLAY;
    }
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
  setTurn(turn: number) {
    if (turn < 1 || turn > this.gameStore.game.data.maps.length)
      throw new Error(`Invalid turn number: ${turn}`);
    this.gameStore.setTurn(turn);
    this.unselect();
    this.turnState = this.gameStore.turn === this.gameStore.game.turn ? TurnState.PLAN : TurnState.MOVE;
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
