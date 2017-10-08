import GameStore from "game/stores/game";
import UiStore from "game/stores/ui";

export default class RootStore {
  game: GameStore = new GameStore();
  ui: UiStore = new UiStore();
}
