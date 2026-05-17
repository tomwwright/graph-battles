import { GameMap, Utils } from '@battles/models';
import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectResolvedCurrentPlayerId } from '../../state/selectors';

export function onSetTurn(ctx: HandlerContext, cmd: Cmd<'set-turn'>): void {
  const state = ctx.store.getState();
  if (cmd.turn < 1 || cmd.turn > state.game.turn) return;

  // No need to abort an in-flight replay here — exiting 'replaying' fires the
  // PhaseEffects exit hook in GameOrchestrator which calls phase.abort.abort().

  const isReplaying = cmd.turn < state.game.turn;
  const mapData = state.game.data.maps[cmd.turn - 1];
  // Clone past-turn snapshots so replay mutations don't poison persisted state
  const map = new GameMap(isReplaying ? Utils.clone(mapData) : mapData);
  const carriedPlayerId = selectResolvedCurrentPlayerId(state);

  if (isReplaying) {
    // The reducer constructs the AbortController for the new replaying phase.
    // Entering 'replaying' starts the replay via the PhaseEffects entry hook.
    ctx.store.dispatch({
      type: 'turn/scrubbed-to-past',
      turn: cmd.turn,
      map,
      currentPlayerId: carriedPlayerId,
    });
  } else {
    ctx.store.dispatch({
      type: 'turn/jumped-to-current',
      turn: cmd.turn,
      map,
      currentPlayerId: carriedPlayerId,
    });
  }
}
