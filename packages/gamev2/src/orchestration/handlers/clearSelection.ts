import type { HandlerContext } from '../HandlerContext';

export function onClearSelection(ctx: HandlerContext): void {
  ctx.dispatch({ type: 'selection/clear' });
}
