import type { ID } from '@battles/models';
import type { StoreState } from '../state/types';
import { getValidDestinations } from './Utils';

export type SelectionResult = {
  patch: Partial<StoreState>;
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
 */
export function selectionFromUnitClick(state: StoreState, unitId: ID): Partial<StoreState> {
  const { map, selectedUnitIds, phase } = state;
  const unit = map.unit(unitId);
  if (!unit) return {};

  if (phase.type !== 'planning') {
    return { selectedUnitIds: [unitId], selectedTerritoryId: null };
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

  return { selectedUnitIds: nextSelection, selectedTerritoryId: null };
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
      patch: { selectedTerritoryId: territoryId, selectedUnitIds: [] },
      moveTo: null,
    };
  }

  if (selectedUnitIds.length > 0) {
    const validDestinations = getValidDestinations(map, selectedUnitIds);
    if (validDestinations.includes(territoryId)) {
      return {
        patch: { selectedUnitIds: [], selectedTerritoryId: null },
        moveTo: territoryId,
      };
    }
  }

  const territory = map.territory(territoryId);
  if (!territory) return { patch: {}, moveTo: null };

  return {
    patch: { selectedTerritoryId: territoryId, selectedUnitIds: [] },
    moveTo: null,
  };
}
