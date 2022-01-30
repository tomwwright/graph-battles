import { ID } from '../utils';
import { GameMap } from '../map';

export type ReadyPlayerModelAction = {
  type: 'ready-player';
  playerId: ID;
};

function checkReadyPlayer(map: GameMap, action: ReadyPlayerModelAction) {
  if (!map.player(action.playerId)) {
    throw new Error(`Player ${action.playerId} does not exist in Map!`);
  }
}

export function applyReadyPlayerAction(map: GameMap, action: ReadyPlayerModelAction) {
  checkReadyPlayer(map, action);
  map.addAction(action);
}
