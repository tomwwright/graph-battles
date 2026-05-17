import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';

/**
 * Drives the ResolutionRunner one step forward. `resolve-next` advances by one
 * Resolution; `skip-resolution` drains the rest without animation.
 *
 * `phase.advance` is a one-shot promise resolver wired by ResolutionRunner —
 * resolving it here is what unblocks the runner's `await waitForAdvance()`.
 *
 * Phase 8 of the orchestration refactor moves this resolver off the phase
 * variant and onto the `ReplayingListener`; this handler will then call
 * `ctx.advanceResolution(...)` instead of reading `phase.advance`.
 */
export function onAdvanceResolution(
  ctx: HandlerContext,
  cmd: Cmd<'resolve-next'> | Cmd<'skip-resolution'>,
): void {
  const { phase } = ctx.getState();
  if (phase.type !== 'replaying') return;
  phase.advance?.(cmd.type === 'resolve-next' ? 'next' : 'skip');
  ctx.dispatch({ type: 'phase/set', phase: { ...phase, advance: null } });
}
