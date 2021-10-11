import { SavedGameStore } from 'lobby/stores/savedgame';

export class RootStore {
  savedGameStore: SavedGameStore = new SavedGameStore();
}
