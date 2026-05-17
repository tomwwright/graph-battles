import { Values } from '@battles/models';
import type { ID } from '@battles/models';
import type { GameStore } from '../state/GameStore';
import type { StoreState, Subscribable } from '../state/types';
import { UnitRenderer } from '../rendering/UnitRenderer';

/**
 * Projects unit state onto the renderer. Subscribes to the store, diffs on
 * `mapRevision` change, and adds/removes/moves units accordingly.
 *
 * Owns move animation: when a map mutation lands while `currentResolution`
 * describes a `move` of a given unit, the syncer calls `animateUnitMove` and
 * registers the in-flight promise via `store.trackAnimation` so the
 * resolution sequencer can await `pendingAnimations.length === 0` between
 * generator steps. Other map changes snap the unit position.
 *
 * Mid-animation units are protected inside `UnitRenderer` itself (tracks an
 * `animatingUnits` set), so a revision bump during a lerp won't reset the
 * mesh.
 */
export class UnitSyncer {
  private readonly unsubscribe: () => void;
  private lastRevision = -1;
  private readonly lastPositions = new Map<ID, ID>();

  constructor(
    private readonly source: Subscribable<StoreState>,
    private readonly store: GameStore,
    private readonly renderer: UnitRenderer,
  ) {
    this.syncIfChanged();
    this.unsubscribe = this.source.subscribe(() => this.syncIfChanged());
  }

  dispose(): void {
    this.unsubscribe();
  }

  private syncIfChanged(): void {
    const { mapRevision } = this.source.getState();
    if (mapRevision === this.lastRevision) return;
    this.lastRevision = mapRevision;
    this.sync();
  }

  private sync(): void {
    const state = this.source.getState();
    const { map, currentResolution } = state;
    if (!map) return;

    const replayingSignal =
      state.phase.type === 'replaying' ? state.phase.abort.signal : undefined;

    const currentUnitIds = new Set(map.unitIds);

    // Remove units no longer in the map
    for (const unitId of this.renderer.getUnitIds()) {
      if (!currentUnitIds.has(unitId)) {
        this.renderer.removeUnit(unitId);
        this.lastPositions.delete(unitId);
      }
    }

    // Add / animate / snap units present in the map
    for (const unit of map.units) {
      const player = unit.player;
      const colour = player?.data.colour ?? Values.Colour.WHITE;
      const unitId = unit.data.id;
      const nextLocation = unit.data.locationId;
      const wasPresent = this.renderer.hasUnit(unitId);

      this.renderer.addUnit(unitId, nextLocation, colour);

      const prev = this.lastPositions.get(unitId);
      const isMoveResolution =
        currentResolution !== null &&
        currentResolution.phase === 'move' &&
        currentResolution.unitId === unitId;

      if (wasPresent && prev !== undefined && prev !== nextLocation && isMoveResolution) {
        this.store.trackAnimation(
          this.renderer.animateUnitMove(unitId, prev, nextLocation, replayingSignal),
        );
      } else if (wasPresent && prev !== undefined && prev !== nextLocation) {
        this.renderer.setUnitPosition(unitId, nextLocation);
      }

      this.renderer.setUnitStatus(unitId, unit.data.statuses);
      this.renderer.setUnitDestination(unitId, unit.destinationId);
      this.lastPositions.set(unitId, nextLocation);
    }
  }
}
