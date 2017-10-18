import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';

export default class RootStore {
  gameStore: GameStore = new GameStore();
  uiStore: UiStore = new UiStore(this.gameStore);
}
