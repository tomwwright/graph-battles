import { Color3 } from '@babylonjs/core';
import { ID, GameMap, Values } from '@battles/models';
import { Subscribable } from '../state/types';
import { getValidDestinations } from './getValidDestinations';

export type OverlayState = {
  map: GameMap;
  mapRevision: number;
  selectedUnitIds: ID[];
  selectedTerritoryId: ID | null;
};

export type OverlayTarget = {
  clearOverlays(): void;
  updateTerritoryOverlay(territoryId: ID, color: Color3, alpha?: number): void;
  highlightWaypoints(territoryA: ID, territoryB: ID, color: Color3, alpha?: number): void;
};

/**
 * Syncs hex-grid overlays to current map ownership and selection state.
 * Subscribes to a narrow OverlayState slice and re-paints whenever
 * map ownership, unit selection, or territory selection changes.
 */
export class OverlaySyncer {
  private readonly unsubscribe: () => void;

  private lastRevision = -1;
  private lastSelectedUnitIds: ID[] = [];
  private lastSelectedTerritoryId: ID | null = null;

  constructor(
    private readonly source: Subscribable<OverlayState>,
    private readonly target: OverlayTarget,
  ) {
    this.sync();
    this.unsubscribe = this.source.subscribe(() => this.syncIfChanged());
  }

  dispose(): void {
    this.unsubscribe();
  }

  private syncIfChanged(): void {
    const state = this.source.getState();
    const revisionChanged = state.mapRevision !== this.lastRevision;
    const selectionChanged =
      state.selectedTerritoryId !== this.lastSelectedTerritoryId ||
      !arrayShallowEqual(state.selectedUnitIds, this.lastSelectedUnitIds);

    if (!revisionChanged && !selectionChanged) return;

    this.lastRevision = state.mapRevision;
    this.lastSelectedUnitIds = state.selectedUnitIds;
    this.lastSelectedTerritoryId = state.selectedTerritoryId;
    this.sync();
  }

  private sync(): void {
    const { map, selectedUnitIds, selectedTerritoryId } = this.source.getState();
    if (!map) return;

    // Base layer: territory ownership colours
    this.target.clearOverlays();
    for (const territory of map.territories) {
      const player = territory.player;
      if (player) {
        this.target.updateTerritoryOverlay(
          territory.data.id,
          colourToColor3(player.data.colour),
        );
      }
    }

    // Selection layer
    if (selectedUnitIds.length > 0) {
      const firstUnit = map.unit(selectedUnitIds[0]);
      const host = firstUnit ? map.territory(firstUnit.data.locationId) : null;
      if (!host) return;

      const destinations = getValidDestinations(map, selectedUnitIds);
      const highlightColor = new Color3(0.2, 1.0, 0.3);
      const grassHighlightColor = new Color3(0.6, 1.0, 0.4);

      for (const destId of destinations) {
        this.target.updateTerritoryOverlay(destId, highlightColor, 0.15);
        this.target.highlightWaypoints(host.data.id, destId, grassHighlightColor, 0.18);
      }
      return;
    }

    if (selectedTerritoryId != null) {
      this.target.updateTerritoryOverlay(selectedTerritoryId, new Color3(1.0, 1.0, 1.0), 0.2);
    }
  }
}

function colourToColor3(colour: Values.Colour): Color3 {
  const r = ((colour >> 16) & 0xff) / 255;
  const g = ((colour >> 8) & 0xff) / 255;
  const b = (colour & 0xff) / 255;
  return new Color3(r, g, b);
}

function arrayShallowEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
