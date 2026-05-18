import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';

/**
 * Drives the replay step gate one step forward. `resolve-next` advances by
 * one Resolution; `skip-resolution` drains the rest without animation.
 *
 * The resolver lives on `ReplayingListener` and is reached via
 * `ctx.advanceResolution` — no phase-state round-trip.
 */
export function onAdvanceResolution(
  ctx: HandlerContext,
  cmd: Cmd<'resolve-next'> | Cmd<'skip-resolution'>,
): void {
  if (ctx.getState().phase.type !== 'replaying') return;
  ctx.advanceResolution(cmd.type === 'resolve-next' ? 'next' : 'skip');
}
