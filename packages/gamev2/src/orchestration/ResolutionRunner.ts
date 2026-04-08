import { Color3 } from '@babylonjs/core';
import { ID, Resolution, GameMap, Values, Utils } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { GameRenderer } from '../rendering/GameRenderer';

/**
 * Drives the resolveTurn() generator. Maps each Resolution type to the
 * appropriate store updates and renderer calls. Supports step-by-step
 * advance, skip-to-end, and abort via AbortSignal.
 *
 * The generator yields each Resolution BEFORE applying the mutation.
 * The next call to generator.next() applies the mutation. This gives
 * the runner a window to read pre-mutation state and animate transitions.
 */
export class ResolutionRunner {
  private store: GameStore;
  private renderer: GameRenderer;

  constructor(store: GameStore, renderer: GameRenderer) {
    this.store = store;
    this.renderer = renderer;
  }

  async run(
    generator: Generator<Resolution>,
    waitForAdvance: () => Promise<'next' | 'skip'>,
    signal: AbortSignal,
    onPostStep?: () => void
  ): Promise<void> {
    let result = generator.next();

    while (!result.done) {
      if (signal.aborted) return;

      const resolution = result.value;

      console.log("RESOLUTION", resolution);

      // Check visibility — skip invisible resolutions
      if (!this.isResolutionVisible(resolution)) {
        result = generator.next();
        continue;
      }

      // Read pre-mutation state for animation
      const preState = this.capturePreState(resolution);

      // Update store with current resolution (React UI shows what's about to happen)
      this.store.setState({ currentResolution: resolution });

      // Focus camera on resolution subject
      const focusTerritoryId = this.getResolutionFocusTerritory(resolution);
      if (focusTerritoryId) {
        await this.renderer.focusOn(focusTerritoryId);
      }

      // Wait for user to advance (or skip)
      const action = await waitForAdvance();
      if (signal.aborted) return;

      if (action === 'skip') {
        // Drain remaining resolutions without animation
        while (!result.done) {
          result = generator.next();
        }
        // Sync final state to store and renderer
        this.syncPostResolution();
        onPostStep?.();
        break;
      }

      // Apply mutation by advancing generator
      result = generator.next();

      // Read post-mutation state and animate
      await this.animateResolution(resolution, preState, signal);
      if (signal.aborted) return;

      // Notify store of post-mutation state (shallow copy forces React re-render)
      this.syncPostResolution();
      onPostStep?.();
    }

    this.store.setState({ currentResolution: null });
  }

  // --- Visibility ---

  private isResolutionVisible(resolution: Resolution): boolean {
    const { visibilityMode } = this.store.getState();
    if (visibilityMode === 'all') return true;

    switch (resolution.phase) {
      case 'move':
      case 'add-defend':
        return this.isUnitVisible(resolution.unitId);
      case 'combat':
        return this.isLocationVisible(resolution.locationId);
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return this.isLocationVisible(resolution.territoryId);
      case 'gold':
        return true;
    }
  }

  private isLocationVisible(locationId: ID): boolean {
    const visibleIds = this.getVisibleLocationIds();
    return visibleIds.has(locationId);
  }

  private isUnitVisible(unitId: ID): boolean {
    const { map } = this.store.getState();
    const unit = map.unit(unitId);
    if (!unit) return false;

    const visibleIds = this.getVisibleLocationIds();
    if (visibleIds.has(unit.data.locationId)) return true;

    // Also visible if moving to/from a visible area
    if (unit.destinationId && visibleIds.has(unit.destinationId)) return true;

    return false;
  }

  private getVisibleLocationIds(): Set<ID> {
    const { map, currentPlayerId } = this.store.getState();
    const visible = new Set<ID>();

    const player = map.player(currentPlayerId);
    if (!player) return visible;

    // Player's territories and territories where player has units
    const playerTerritories = [
      ...player.territories,
      ...player.units
        .map((u) => u.location)
        .filter((loc) => loc?.data.type === 'territory'),
    ];

    for (const territory of playerTerritories) {
      if (!territory) continue;
      visible.add(territory.data.id);
      // Adjacent territories are also visible
      if ('edges' in territory) {
        for (const edge of (territory as any).edges) {
          visible.add(edge.data.id);
          visible.add(edge.data.territoryAId);
          visible.add(edge.data.territoryBId);
        }
      }
    }

    return visible;
  }

  // --- Pre/post state capture ---

  private capturePreState(resolution: Resolution): PreState {
    const { map } = this.store.getState();

    switch (resolution.phase) {
      case 'move': {
        const unit = map.unit(resolution.unitId);
        return { type: 'move', unitId: resolution.unitId, locationId: unit?.data.locationId ?? null };
      }
      case 'territory-action': {
        const territory = map.territory(resolution.territoryId);
        return {
          type: 'territory-action',
          territoryId: resolution.territoryId,
          properties: territory ? [...territory.data.properties] : [],
        };
      }
      default:
        return { type: 'other' };
    }
  }

  // --- Animation dispatch ---

  private async animateResolution(resolution: Resolution, preState: PreState, signal: AbortSignal): Promise<void> {
    const { map } = this.store.getState();

    switch (resolution.phase) {
      case 'move': {
        if (preState.type !== 'move' || !preState.locationId) break;
        const unit = map.unit(resolution.unitId);
        if (!unit) break;

        const newLocationId = unit.data.locationId;
        // Only animate when the unit lands on a territory (final landing).
        // The first step (territory→edge) is silent; the second step
        // (edge→territory) is when we lerp visually.
        const newTerritory = map.territory(newLocationId);
        if (!newTerritory) break;

        // Determine source territory:
        // - If pre-state was a territory, use it directly (single-step move).
        // - If pre-state was an edge, use the OTHER endpoint of the edge.
        let fromTerritoryId: ID | null = null;
        if (map.territory(preState.locationId)) {
          fromTerritoryId = preState.locationId;
        } else {
          const edge = map.edge(preState.locationId);
          if (edge) {
            fromTerritoryId =
              edge.data.territoryAId === newLocationId
                ? edge.data.territoryBId
                : edge.data.territoryAId;
          }
        }

        if (fromTerritoryId && fromTerritoryId !== newLocationId) {
          await this.renderer.animateUnitMove(resolution.unitId, fromTerritoryId, newLocationId, signal);
        }
        break;
      }
      case 'territory-action': {
        if (preState.type !== 'territory-action') break;
        const territory = map.territory(resolution.territoryId);
        if (!territory) break;
        this.renderer.updateTerritoryComposition(
          resolution.territoryId,
          preState.properties,
          territory.data.properties
        );
        break;
      }
      case 'territory-control': {
        const territory = map.territory(resolution.territoryId);
        if (!territory) break;
        const player = territory.player;
        if (player) {
          const color = this.playerColor(player.data.colour);
          this.renderer.updateTerritoryOverlay(resolution.territoryId, color);
        }
        break;
      }
      // combat, food, gold, add-defend — no animation needed yet
    }
  }

  /** Resolve a location ID (which may be an edge) to its best territory ID */
  private resolveToTerritoryId(map: GameMap, locationId: ID): ID | null {
    if (map.territory(locationId)) return locationId;
    const edge = map.edge(locationId);
    if (edge) return edge.data.territoryAId;
    return null;
  }

  // --- Post-resolution sync ---

  private syncPostResolution(): void {
    const { map } = this.store.getState();
    // Shallow copy forces useSyncExternalStore to detect the change
    // even though map is mutated in place
    this.store.setState({ map });
  }

  // --- Camera focus ---

  private getResolutionFocusTerritory(resolution: Resolution): ID | null {
    const { map } = this.store.getState();

    switch (resolution.phase) {
      case 'move':
      case 'add-defend': {
        const unit = map.unit(resolution.unitId);
        if (!unit) return null;
        // Focus on unit's current territory
        const loc = unit.data.locationId;
        if (map.territory(loc)) return loc;
        const edge = map.edge(loc);
        if (edge) return edge.data.territoryAId;
        return null;
      }
      case 'combat':
        return this.resolveToTerritoryId(map, resolution.locationId);
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return resolution.territoryId;
      case 'gold':
        return null; // Don't focus camera for gold
    }
  }

  private playerColor(colour: Values.Colour): Color3 {
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    return new Color3(r, g, b);
  }
}

type PreState =
  | { type: 'move'; unitId: ID; locationId: ID | null }
  | { type: 'territory-action'; territoryId: ID; properties: Values.TerritoryProperty[] }
  | { type: 'other' };
