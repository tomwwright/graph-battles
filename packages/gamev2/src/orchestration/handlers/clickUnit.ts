import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectionFromUnitClick } from '../selection';

export function onClickUnit(ctx: HandlerContext, cmd: Cmd<'click-unit'>): void {
  const patch = selectionFromUnitClick(ctx.store.getState(), cmd.unitId);
  if (Object.keys(patch).length > 0) ctx.store.setState(patch);
}
