import { ID } from '../utils';
import { GameMap, PendingActionType } from '../map';

export type ReadyPlayerModelAction = {
  type: 'ready-player';
  playerId: ID;
  isReady: boolean;
};

export function applyReadyPlayer(map: GameMap, action: ReadyPlayerModelAction) {
  const player = map.players.find((player) => player.data.id === action.playerId);
  if (!player) throw new Error(`Invalid Player ID ${action.playerId}`);

  // Remove any existing ready action for this player
  map.data.pendingActions = map.data.pendingActions.filter(
    (a) => !(a.type === PendingActionType.READY && a.playerId === action.playerId)
  );

  if (action.isReady) {
    map.data.pendingActions.push({ type: PendingActionType.READY, playerId: action.playerId });
  }
}
