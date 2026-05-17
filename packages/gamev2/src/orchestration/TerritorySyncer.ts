import { Color3 } from '@babylonjs/core';
import { ID, GameMap, Resolution, Values } from '@battles/models';
import type { Subscribable } from '../state/types';
import { getValidDestinations } from './Utils';

/** Minimal `StoreState` shape this syncer reads. */
type TerritorySyncerState = {
  map: GameMap;
  mapRevision: number;
  currentResolution: Resolution | null;
  selectedUnitIds: ID[];
  selectedTerritoryId: ID | null;
};

export type TerritoryRenderTarget = {
  clearOverlays(): void;
  updateTerritoryOverlay(territoryId: ID, color: Color3, alpha?: number): void;
  highlightWaypoints(territoryA: ID, territoryB: ID, color: Color3, alpha?: number): void;
  updateTerritoryComposition(
    territoryId: ID,
    prevProperties: Values.TerritoryProperty[],
    nextProperties: Values.TerritoryProperty[],
  ): void;
};

/**
 * Projects territory state onto the renderer:
 *
 * - **Ownership overlay** — per-territory base colour from `territory.player`.
 *   Repainted on every map mutation, so `territory-control` resolutions land
 *   without special-case handling.
 * - **Selection overlay** — valid destinations + grass waypoints when units
 *   are selected, or selected-territory highlight otherwise.
 * - **Composition** — when `currentResolution.phase === 'territory-action'`
 *   and the territory matches, the syncer hands the prev/next property
 *   arrays to the renderer so tile meshes are swapped. `updateTerritory` is
 *   a no-op when the arrays match, so calling it on every revision is safe.
 *
 * Slice combines three inputs (map revision, current resolution, selection)
 * — the syncer projects multiple state slices into the renderer in one pass.
 */
export class TerritorySyncer {
  private readonly unsubscribe: () => void;

  private lastRevision = -1;
  private lastSelectedUnitIds: ID[] = [];
  private lastSelectedTerritoryId: ID | null = null;
  private readonly lastProperties = new Map<ID, Values.TerritoryProperty[]>();

  constructor(
    private readonly source: Subscribable<TerritorySyncerState>,
    private readonly target: TerritoryRenderTarget,
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
    const state = this.source.getState();
    const { map, currentResolution, selectedUnitIds, selectedTerritoryId } = state;
    if (!map) return;

    this.syncComposition(map, currentResolution);
    this.syncOverlays(map, selectedUnitIds, selectedTerritoryId);
  }

  private syncComposition(
    map: GameMap,
    currentResolution: Resolution | null,
  ): void {
    const animateId =
      currentResolution !== null && currentResolution.phase === 'territory-action'
        ? currentResolution.territoryId
        : null;

    for (const territory of map.territories) {
      const id = territory.data.id;
      const next = territory.data.properties;
      const prev = this.lastProperties.get(id);

      // First sight of the territory: prime cache, skip — `MapRenderer.loadMap`
      // already placed the initial tiles during renderer init.
      if (prev === undefined) {
        this.lastProperties.set(id, [...next]);
        continue;
      }

      if (id === animateId || !arraysEqual(prev, next)) {
        this.target.updateTerritoryComposition(id, prev, next);
        this.lastProperties.set(id, [...next]);
      }
    }
  }

  private syncOverlays(map: GameMap, selectedUnitIds: ID[], selectedTerritoryId: ID | null): void {
    // Base layer: territory ownership colours
    this.target.clearOverlays();
    for (const territory of map.territories) {
      const player = territory.player;
      if (player) {
        this.target.updateTerritoryOverlay(territory.data.id, colourToColor3(player.data.colour));
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

function arraysEqual(a: Values.TerritoryProperty[], b: Values.TerritoryProperty[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
