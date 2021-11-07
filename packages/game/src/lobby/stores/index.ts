import { SavedGameStore } from 'lobby/stores/savedgame';
import { RemoteGameStore } from 'lobby/stores/remotegame';

export class RootStore {
  savedGameStore: SavedGameStore = new SavedGameStore();
  remoteGameStore: RemoteGameStore = new RemoteGameStore();
}
