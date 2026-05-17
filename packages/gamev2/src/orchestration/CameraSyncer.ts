import { GameMap, Resolution } from '@battles/models';
import type { ID } from '@battles/models';
import type { AnimationTracker, Subscribable } from '../state/types';

/** Minimal `StoreState` shape this syncer reads. */
type CameraSyncerState = { currentResolution: Resolution | null; map: GameMap };

export type CameraTarget = {
  focusOn(territoryId: ID): Promise<void>;
};

/**
 * Drives camera focus from `currentResolution`. When a resolution becomes
 * active, the syncer resolves it to a focus territory (location → territory
 * for edges, `territoryAId` fallback) and asks the renderer to glide the
 * camera there. The in-flight focus promise is registered via
 * `store.trackAnimation` so the resolution sequencer awaits it.
 *
 * Owns `getResolutionFocusTerritory` — previously lived inside
 * `ResolutionRunner`.
 */
export class CameraSyncer {
  private readonly unsubscribe: () => void;
  private lastResolution: Resolution | null = null;

  constructor(
    private readonly source: Subscribable<CameraSyncerState>,
    private readonly tracker: AnimationTracker,
    private readonly renderer: CameraTarget,
  ) {
    this.unsubscribe = this.source.subscribe(() => this.onChange());
  }

  dispose(): void {
    this.unsubscribe();
  }

  private onChange(): void {
    const state = this.source.getState();
    const next = state.currentResolution;
    if (next === this.lastResolution) return;
    this.lastResolution = next;
    if (!next) return;
    const focusId = getResolutionFocusTerritory(next, state.map);
    if (focusId == null) return;
    this.tracker.trackAnimation(this.renderer.focusOn(focusId));
  }
}

/** Pure: which territory should be in shot for a given resolution. */
function getResolutionFocusTerritory(resolution: Resolution, map: GameMap): ID | null {
  switch (resolution.phase) {
    case 'move':
    case 'add-defend': {
      const unit = map.unit(resolution.unitId);
      if (!unit) return null;
      const loc = unit.data.locationId;
      if (map.territory(loc)) return loc;
      const edge = map.edge(loc);
      return edge ? edge.data.territoryAId : null;
    }
    case 'combat': {
      if (map.territory(resolution.locationId)) return resolution.locationId;
      const edge = map.edge(resolution.locationId);
      return edge ? edge.data.territoryAId : null;
    }
    case 'food':
    case 'territory-control':
    case 'territory-action':
      return resolution.territoryId;
    case 'gold':
      return null;
  }
}
