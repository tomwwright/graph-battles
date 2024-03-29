import { observable, action, computed, runInAction } from 'mobx';

import GameStore, { ResolveState, VisibilityMode } from 'game/stores/game';
import PhaserStore from 'game/stores/phaser';
import { ID, Territory, Utils } from '@battles/models';

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
  ALL_PLAYERS_READY = 'all-players-ready',
  REPLAYING = 'replaying',
  PLANNING = 'planning',
  VICTORY = 'victory',
}

export default class UiStore {
  gameStore: GameStore;
  phaserStore: PhaserStore;

  @observable selected: Selected;
  @observable turnState: TurnState = TurnState.NEXT_PLAYER;

  @observable isResolving = false;

  /* Only consider these userIds when cycling through turns */
  @observable filteredUserIds: ID[];

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

    const units = this.selected.ids.map((id) => this.gameStore.map.unit(id));

    if (units.length > 0 && units[0].data.playerId != this.gameStore.currentPlayerId) return [];

    const destinationIds = Utils.intersection(
      ...units.map((unit) =>
        (unit.location as Territory).edges.map((edge) => edge.other(unit.location as Territory).data.id)
      )
    );

    return destinationIds;
  }

  @computed
  get activePlayerIds() {
    const playerIds = this.filteredUserIds
      ? this.gameStore.game.users
          .filter((user) => this.filteredUserIds.includes(user.data.id))
          .map((user) => user.players.map((player) => player.data.id))
          .flat()
      : this.gameStore.map.playerIds;

    return playerIds;
  }

  @action
  setFilteredUserIds(userIds: ID[]) {
    this.filteredUserIds = userIds;
  }

  @action
  onClickTerritory(territoryId: ID) {
    if (
      !this.selected ||
      this.selected.type === 'territory' ||
      this.gameStore.isReplaying ||
      this.validDestinationIds.indexOf(territoryId) === -1
    ) {
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
        this.selectUnits(Utils.include(this.selected.ids, unitId));
      } else {
        this.selectUnits(Utils.exclude(this.selected.ids, unitId));
      }
    }
  }

  @action
  onClickNextPlayerGo() {
    this.gameStore.setVisibility(VisibilityMode.CURRENT_PLAYER);
    this.setTurn(Math.max(1, this.gameStore.game.turn - 1));
  }

  @action
  onClickReplayVictory() {
    this.gameStore.setVisibility(VisibilityMode.VISIBLE);
    this.setTurn(Math.max(1, this.gameStore.game.turn - 1));
  }

  @action
  async onClickReady() {
    this.gameStore.setVisibility(VisibilityMode.NOT_VISIBLE);
    await this.gameStore.onReadyPlayer(true);

    const playerIds = this.activePlayerIds;

    const currentPlayerIdx = playerIds.indexOf(this.gameStore.currentPlayerId);
    if (currentPlayerIdx < playerIds.length - 1) {
      this.setPlayer(playerIds[currentPlayerIdx + 1]);
    } else {
      this.onAllPlayersReady();
    }
  }

  @action
  onAllPlayersReady() {
    this.turnState = TurnState.ALL_PLAYERS_READY;

    /* set up scheduled polling here! */

    const currentTurn = this.gameStore.turn;

    const checkForResolvedTurn = async () => {
      console.log('Checking game state...');

      const game = await this.gameStore.provider.get();

      if (game.turn > currentTurn) {
        this.gameStore.setGame(game.data);
        this.gameStore.setTurn(game.turn);
        if (game.winners.length > 0) {
          this.onVictory();
        } else {
          this.setFirstPlayer();
        }
      } else {
        setTimeout(checkForResolvedTurn, 10000);
      }
    };
    checkForResolvedTurn();
  }

  @action
  onVictory() {
    this.gameStore.setCurrentPlayer(null);
    this.unselect();
    this.gameStore.setVisibility(VisibilityMode.VISIBLE);
    this.turnState = TurnState.VICTORY;
  }

  @action
  setFirstPlayer() {
    this.setPlayer(this.activePlayerIds[0]);
  }

  @action
  setPlayer(playerId: ID) {
    this.gameStore.setCurrentPlayer(playerId);
    this.unselect();
    this.turnState = TurnState.NEXT_PLAYER;
  }

  @action
  setTurn(turn: number) {
    if (turn < 1 || turn > this.gameStore.game.data.maps.length) throw new Error(`Invalid turn number: ${turn}`);
    this.gameStore.setTurn(turn);
    this.unselect();
    this.turnState = this.gameStore.isReplaying ? TurnState.REPLAYING : TurnState.PLANNING;
  }

  @action
  selectTerritory(territoryId: ID) {
    const territoryAlreadySelected =
      this.selected && this.selected.type === 'territory' && this.selected.id === territoryId;
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
        ids: unitIds,
      };
    }
  }

  @action
  unselect() {
    this.selected = null;
  }

  @action
  onClickResolve(id: ID) {
    if (this.isResolving) {
      return;
    }
    const focusIds = this.gameStore.resolveState === ResolveState.GOLD ? this.gameStore.map.territoryIds : [id];
    this.isResolving = true;
    this.phaserStore.focusOn(focusIds).then(() => {
      runInAction(() => {
        this.gameStore.resolve(id);
        this.isResolving = false;

        if (this.gameStore.resolveState == ResolveState.NONE && this.gameStore.game.winners.length == 0) {
          this.setTurn(this.gameStore.turn + 1);
        }
      });
    });
  }
}
