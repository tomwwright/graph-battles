import { ID } from '../utils';
import { GameMap } from '../map';

export type ReadyPlayerModelAction = {
  type: 'ready-player';
  playerId: ID;
};
