import type { HandlerContext } from '../HandlerContext';

export function onConfirmNextPlayer(ctx: HandlerContext): void {
  const { phase } = ctx.getState();
  if (phase.type !== 'next-player') return;
  ctx.dispatch({
    type: 'phase/set',
    phase: { type: 'planning', currentPlayerId: phase.currentPlayerId },
  });
}
