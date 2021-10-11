import { ID } from '../utils';
import GameMap from '../map';

export type ReadyPlayerModelAction = {
  type: 'ready-player';
  playerId: ID;
  isReady: boolean;
};

export function applyReadyPlayer(map: GameMap, action: ReadyPlayerModelAction) {
  const player = map.players.find((player) => player.data.id === action.playerId);
  if (!player) throw new Error(`Invalid Player ID ${action.playerId}`);

  player.data.ready = action.isReady;
}
