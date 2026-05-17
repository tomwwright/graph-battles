import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectionFromUnitClick } from '../selection';

export function onClickUnit(ctx: HandlerContext, cmd: Cmd<'click-unit'>): void {
  const selection = selectionFromUnitClick(ctx.store.getState(), cmd.unitId);
  if (!selection) return;
  ctx.store.dispatch({
    type: 'selection/set',
    unitIds: selection.unitIds,
    territoryId: selection.territoryId,
  });
}
