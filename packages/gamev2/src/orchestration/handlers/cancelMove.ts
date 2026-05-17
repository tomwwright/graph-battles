import type { ID } from '@battles/models';
import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';

export function onCancelMove(ctx: HandlerContext, cmd: Cmd<'cancel-move'>): void {
  if (ctx.store.getState().phase.type !== 'planning') return;
  ctx.store.dispatch({ type: 'selection/units', unitIds: [] });
  // Passing a null destination refunds and removes the pending move
  // (see packages/models/src/actions/move.ts).
  ctx.applyAction({
    type: 'move-units',
    unitIds: cmd.unitIds,
    destinationId: null as unknown as ID,
  });
}
