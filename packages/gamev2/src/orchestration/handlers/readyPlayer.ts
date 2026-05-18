import type { HandlerContext } from '../HandlerContext';
import { selectPlayablePlayerIds } from '../../state/selectors';

export function onReadyPlayer(ctx: HandlerContext): void {
  const state = ctx.getState();
  if (state.phase.type !== 'planning') return;

  const cycle = selectPlayablePlayerIds(state);
  const idx = cycle.indexOf(state.phase.currentPlayerId);
  const isLast = idx >= cycle.length - 1;

  ctx.applyAction({
    type: 'ready-player',
    playerId: state.phase.currentPlayerId,
    isReady: true,
  });

  if (isLast) {
    // Entering 'waiting' kicks `provider.waitForTurn` via
    // `WaitForTurnResolutionListener`. Local: provider.action above
    // already advanced persisted turn. Remote: action sent to API; the
    // listener-driven poll waits for the server to resolve.
    ctx.dispatch({
      type: 'phase/set',
      phase: { type: 'waiting', submittedAtTurn: state.turn },
    });
  } else {
    ctx.dispatch({
      type: 'phase/set',
      phase: { type: 'next-player', currentPlayerId: cycle[idx + 1] },
    });
    ctx.dispatch({ type: 'selection/clear' });
  }
}
