import { GameMap, Utils } from '@battles/models';
import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import {
  currentPlayerIdFromPhase,
  selectPlayablePlayerIds,
} from '../../state/selectors';

export function onSetTurn(ctx: HandlerContext, cmd: Cmd<'set-turn'>): void {
  const state = ctx.store.getState();
  if (cmd.turn < 1 || cmd.turn > state.game.turn) return;

  // No need to abort an in-flight replay here — exiting 'replaying' fires the
  // PhaseEffects exit hook in GameOrchestrator which calls phase.abort.abort().

  const isReplaying = cmd.turn < state.game.turn;
  const mapData = state.game.data.maps[cmd.turn - 1];
  // Clone past-turn snapshots so replay mutations don't poison persisted state
  const map = new GameMap(isReplaying ? Utils.clone(mapData) : mapData);
  const carriedPlayerId =
    currentPlayerIdFromPhase(state.phase) ??
    selectPlayablePlayerIds(state)[0] ??
    state.map.playerIds[0];

  if (isReplaying) {
    const abort = new AbortController();
    // Entering 'replaying' starts the replay via the PhaseEffects entry hook.
    // No `onComplete` — when the replay finishes the phase just stays.
    ctx.store.setState({
      map,
      turn: cmd.turn,
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
      phase: { type: 'replaying', abort, advance: null, currentPlayerId: carriedPlayerId },
    });
  } else {
    ctx.store.setState({
      map,
      turn: cmd.turn,
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
      phase: { type: 'planning', currentPlayerId: carriedPlayerId },
    });
  }
}
