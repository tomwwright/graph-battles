import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectionFromTerritoryClick } from '../selection';

export function onClickTerritory(ctx: HandlerContext, cmd: Cmd<'click-territory'>): void {
  const state = ctx.getState();
  const result = selectionFromTerritoryClick(state, cmd.territoryId);

  if (result.selection) {
    ctx.dispatch({
      type: 'selection/set',
      unitIds: result.selection.unitIds,
      territoryId: result.selection.territoryId,
    });
  }

  if (result.moveTo != null) {
    // Click landed on a valid destination — emit a move action against the
    // previously selected unit list (we already cleared selection above).
    ctx.applyAction({
      type: 'move-units',
      unitIds: state.selectedUnitIds,
      destinationId: result.moveTo,
    });
  }
}
