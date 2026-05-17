import type { HandlerContext } from '../HandlerContext';

export function onConfirmNextPlayer(ctx: HandlerContext): void {
  const { phase } = ctx.store.getState();
  if (phase.type !== 'next-player') return;
  ctx.store.setState({ phase: { type: 'planning', currentPlayerId: phase.currentPlayerId } });
}
