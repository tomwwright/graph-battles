import GameStore from 'game/stores/game';
import PhaserStore from 'game/stores/phaser';
import UiStore from 'game/stores/ui';

export default class RootStore {
  phaserStore: PhaserStore = new PhaserStore();
  gameStore: GameStore = new GameStore(this.phaserStore);
  uiStore: UiStore = new UiStore(this.gameStore, this.phaserStore);
}
