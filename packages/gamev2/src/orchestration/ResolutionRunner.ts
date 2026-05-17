import { Resolution } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { isLocationVisible, isUnitVisible } from './Utils';
import { selectNoRunningAnimations, selectCurrentPlayerId } from '../state/selectors';

/**
 * Drives a `resolveTurn()` generator. Each iteration:
 *
 * 1. Publish the next resolution via `resolution/set` so syncers can kick off
 *    pre-step work (camera focus).
 * 2. Wait for those animations to finish.
 * 3. Wait for the user to advance (or skip).
 * 4. Advance the generator (applies the mutation in place).
 * 5. Dispatch `map/mutated`. Syncers diff, animate the matching change, and
 *    register their work via `store.trackAnimation`.
 * 6. Wait until `pendingAnimations` is idle, then loop.
 *
 * The runner no longer touches the renderer directly. All visual changes flow
 * through the syncers (`UnitSyncer`, `TerritorySyncer`, `CameraSyncer`) that
 * subscribe to the store. Visibility filtering and step gating are the only
 * responsibilities left here.
 *
 * Order matters: `resolution/set` must be dispatched BEFORE `map/mutated` so
 * the syncer reading the new map can see the resolution context and animate
 * the right change. Skip flushes `resolution/set: null` before the final
 * `map/mutated` so syncers snap the drained state instead of animating from
 * a stale resolution.
 */
export class ResolutionRunner {
  constructor(private readonly store: GameStore) { }

  async run(
    generator: Generator<Resolution>,
    waitForAdvance: () => Promise<'next' | 'skip'>,
    signal: AbortSignal,
  ): Promise<void> {
    let result = generator.next();

    while (!result.done) {
      if (signal.aborted) return;

      const resolution = result.value;

      if (!this.isResolutionVisible(resolution)) {
        result = generator.next();
        continue;
      }

      this.store.dispatch({ type: 'resolution/set', resolution });
      await this.waitForNoRunningAnimations(signal);
      if (signal.aborted) return;

      const action = await waitForAdvance();
      if (signal.aborted) return;

      if (action === 'skip') {
        // Drain remaining resolutions and clear the resolution flag so syncers
        // snap the final state instead of animating into it from a stale frame.
        while (!result.done) {
          result = generator.next();
        }
        this.store.dispatch({ type: 'resolution/set', resolution: null });
        this.store.dispatch({ type: 'map/mutated' });
        return;
      }

      result = generator.next();
      this.store.dispatch({ type: 'map/mutated' });
      await this.waitForNoRunningAnimations(signal);
    }

    this.store.dispatch({ type: 'resolution/set', resolution: null });
  }

  private isResolutionVisible(resolution: Resolution): boolean {
    const state = this.store.getState();
    if (state.visibilityMode === 'all') return true;
    const currentPlayerId = selectCurrentPlayerId(state);
    if (!currentPlayerId) return true;
    const { map } = state;

    switch (resolution.phase) {
      case 'move':
      case 'add-defend':
        return isUnitVisible(map, currentPlayerId, resolution.unitId);
      case 'combat':
        return isLocationVisible(map, currentPlayerId, resolution.locationId);
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return isLocationVisible(map, currentPlayerId, resolution.territoryId);
      case 'gold':
        return true;
    }
  }

  private waitForNoRunningAnimations(signal: AbortSignal): Promise<void> {
    if (selectNoRunningAnimations(this.store.getState())) return Promise.resolve();
    return new Promise((resolve) => {
      const unsub = this.store.subscribe(() => {
        if (signal.aborted || selectNoRunningAnimations(this.store.getState())) {
          unsub();
          resolve();
        }
      });
    });
  }
}
