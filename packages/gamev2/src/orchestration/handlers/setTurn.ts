import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';

export function onSetTurn(ctx: HandlerContext, cmd: Cmd<'set-turn'>): void {
  ctx.dispatch({ type: 'turn/set', turn: cmd.turn });
}
