import { Game, GameData } from '@battles/models';
import { Actions } from '@battles/models';

/**
 * Interface for submitting actions and fetching game state.
 * Implementations: LocalGameProvider (localStorage), APIGameProvider (REST).
 */
export interface GameProvider {
  get(): Promise<Game>;
  action(action: Actions.ModelAction): Promise<Game>;
  create(config: GameConfig): Promise<Game>;
}

export type GameConfig = {
  playerCount: number;
  mapId: string;
};
