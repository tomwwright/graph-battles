import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectionFromUnitClick } from '../selection';

/**
 * Generic focus: resolve `id` to a territory, unit, or edge.
 * - territory → select for inspection, focus.
 * - unit → phase-aware selection via `selectionFromUnitClick` (toggle/multi
 *   during planning, single-select otherwise), focus.
 * - edge → no selection slot; focus only.
 *
 * The camera target — including unit-id → location centroid resolution — is
 * owned by the renderer. See `GameRenderer.focusOn`.
 *
 * Distinct from `click-territory`/`click-unit` which carry renderer-click
 * semantics (e.g. valid-destination → move). UI list panels dispatch this.
 */
export function onFocus(ctx: HandlerContext, cmd: Cmd<'focus'>): void {
  const state = ctx.getState();
  const { map } = state;
  const { id } = cmd;

  if (map.territory(id)) {
    ctx.dispatch({ type: 'selection/set', unitIds: [], territoryId: id });
    ctx.focusOn(id);
    return;
  }

  if (map.unit(id)) {
    const selection = selectionFromUnitClick(state, id);
    if (selection) {
      ctx.dispatch({
        type: 'selection/set',
        unitIds: selection.unitIds,
        territoryId: selection.territoryId,
      });
    }
    ctx.focusOn(id);
    return;
  }

  if (map.edge(id)) {
    ctx.focusOn(id);
  }
}
