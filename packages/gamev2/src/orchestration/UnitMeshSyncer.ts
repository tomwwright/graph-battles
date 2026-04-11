import { Values } from '@battles/models';
import { MapState, Subscribable } from '../state/types';
import { UnitRenderer } from '../rendering/UnitRenderer';

/**
 * Syncs unit meshes in the renderer to current map state. Subscribes to a
 * narrow `MapState` source and re-runs a diff whenever `mapRevision` bumps.
 *
 * Adds new units, removes units no longer present, repositions existing units
 * onto their host territory, and updates status indicators and planned move
 * lines.
 *
 * Mid-animation units are skipped by `UnitRenderer` itself (it tracks an
 * `animatingUnits` set), so a revision bump during a lerp won't snap meshes.
 */
export class UnitMeshSyncer {
  private readonly unsubscribe: () => void;
  private lastRevision = -1;

  constructor(
    private readonly source: Subscribable<MapState>,
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
    const { map } = this.source.getState();
    if (!map) return;

    const currentUnitIds = new Set(map.unitIds);

    // Remove units no longer in the map
    for (const unitId of this.renderer.getUnitIds()) {
      if (!currentUnitIds.has(unitId)) {
        this.renderer.removeUnit(unitId);
      }
    }

    // Add/update units present in the map
    for (const unit of map.units) {
      const player = unit.player;
      const colour = player?.data.colour ?? Values.Colour.WHITE;

      this.renderer.addUnit(unit.data.id, unit.data.locationId, colour);
      this.renderer.setUnitPosition(unit.data.id, unit.data.locationId);

      this.renderer.setUnitStatus(unit.data.id, unit.data.statuses);
      this.renderer.setUnitDestination(unit.data.id, unit.destinationId);
    }
  }
}
