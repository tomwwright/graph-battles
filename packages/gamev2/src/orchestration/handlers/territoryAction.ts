import type { Values } from '@battles/models';
import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';

export function onTerritoryAction(ctx: HandlerContext, cmd: Cmd<'territory-action'>): void {
  if (ctx.store.getState().phase.type !== 'planning') return;
  // `action: null` cancels the pending action — see packages/models/src/actions/territory.ts
  ctx.applyAction({
    type: 'territory',
    territoryId: cmd.territoryId,
    action: cmd.action as Values.TerritoryAction,
  });
}
