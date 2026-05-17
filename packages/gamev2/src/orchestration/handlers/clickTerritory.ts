import type { HandlerContext } from '../HandlerContext';
import type { Cmd } from '../../state/types';
import { selectionFromTerritoryClick } from '../selection';

export function onClickTerritory(ctx: HandlerContext, cmd: Cmd<'click-territory'>): void {
  const state = ctx.store.getState();
  const result = selectionFromTerritoryClick(state, cmd.territoryId);

  if (result.moveTo != null) {
    // Click landed on a valid destination — emit a move action. Apply the
    // selection clear first so the post-action store update reflects the
    // cleared selection alongside the new map state.
    ctx.store.setState(result.patch);
    ctx.applyAction({
      type: 'move-units',
      unitIds: state.selectedUnitIds,
      destinationId: result.moveTo,
    });
    return;
  }

  if (Object.keys(result.patch).length > 0) ctx.store.setState(result.patch);
}
