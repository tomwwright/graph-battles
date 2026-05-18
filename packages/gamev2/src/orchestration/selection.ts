import type { ID } from '@battles/models';
import type { StoreState } from '../state/types';
import { getValidDestinations } from './Utils';

/**
 * Selection delta returned by `selectionFromUnitClick` /
 * `selectionFromTerritoryClick`. `null` means "no change to selection".
 */
export type Selection = { unitIds: ID[]; territoryId: ID | null };

export type SelectionResult = {
  selection: Selection | null;
  /** Set when a unit-bearing territory click resolves to a valid move destination. */
  moveTo: ID | null;
};

/**
 * Pure selection logic for a unit-mesh click.
 *
 * - Nothing/non-unit selected, or selection belongs to a different player → replace with [unitId]
 * - Same player, unit not in selection → add (multi-select)
 * - Same player, unit already in selection → remove (toggle off)
 *
 * Selection is exclusive: a unit selection clears any selected territory.
 *
 * During non-planning phases, units may still be clicked for inspection.
 *
 * Returns `null` if the click resolves to no change (unknown unit id).
 */
export function selectionFromUnitClick(state: StoreState, unitId: ID): Selection | null {
  const { map, selectedUnitIds, phase } = state;
  const unit = map.unit(unitId);
  if (!unit) return null;

  if (phase.type !== 'planning') {
    return { unitIds: [unitId], territoryId: null };
  }

  let nextSelection: ID[];
  if (selectedUnitIds.length === 0) {
    nextSelection = [unitId];
  } else {
    const firstSelected = map.unit(selectedUnitIds[0]);
    const sameOwner = firstSelected != null && firstSelected.data.playerId === unit.data.playerId;
    if (!sameOwner) {
      nextSelection = [unitId];
    } else if (selectedUnitIds.includes(unitId)) {
      nextSelection = selectedUnitIds.filter((id) => id !== unitId);
    } else {
      nextSelection = [...selectedUnitIds, unitId];
    }
  }

  return { unitIds: nextSelection, territoryId: null };
}

/**
 * Pure selection logic for a territory click. May resolve into a move:
 * if units are selected and the clicked territory is a valid destination,
 * `moveTo` is set so the caller can emit the move action.
 *
 * During non-planning phases, territories may still be clicked for inspection.
 */
export function selectionFromTerritoryClick(state: StoreState, territoryId: ID): SelectionResult {
  const { map, selectedUnitIds, phase } = state;
  if (phase.type !== 'planning') {
    return {
      selection: { unitIds: [], territoryId },
      moveTo: null,
    };
  }

  if (selectedUnitIds.length > 0) {
    const validDestinations = getValidDestinations(map, selectedUnitIds);
    if (validDestinations.includes(territoryId)) {
      return {
        selection: { unitIds: [], territoryId: null },
        moveTo: territoryId,
      };
    }
  }

  const territory = map.territory(territoryId);
  if (!territory) return { selection: null, moveTo: null };

  return {
    selection: { unitIds: [], territoryId },
    moveTo: null,
  };
}
