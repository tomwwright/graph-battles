import { HasID, ID, Model, sum } from './utils';
import { PendingActionType } from './map';
import { Colour } from './values';

export type PlayerData = HasID & {
  type: 'player';
  colour: Colour;
  gold: number;
  goldProduction: number;
};

export class Player extends Model<PlayerData> {
  get ready(): boolean {
    return this.map.data.pendingActions.some(
      (a) => a.type === PendingActionType.READY && a.playerId === this.data.id
    );
  }

  get territories() {
    return this.map.territories.filter((territory) => territory.data.playerId === this.data.id);
  }

  get units() {
    return this.map.units.filter((unit) => unit.data.playerId === this.data.id);
  }

  get victoryPoints() {
    return (
      this.data.gold +
      this.units.length +
      this.territories.length +
      sum(this.territories.map((territory) => territory.data.properties.length))
    );
  }

  visibleLocations(): Set<ID> {
    const visible = new Set<ID>();

    const playerTerritories = [
      ...this.territories,
      ...this.units
        .map((u) => u.location)
        .filter((loc) => loc?.data.type === 'territory'),
    ];

    for (const territory of playerTerritories) {
      if (!territory) continue;
      visible.add(territory.data.id);
      if ('edges' in territory) {
        for (const edge of territory.edges) {
          visible.add(edge.data.id);
          visible.add(edge.data.territoryAId);
          visible.add(edge.data.territoryBId);
        }
      }
    }

    return visible;
  }

  isLocationVisible(locationId: ID): boolean {
    return this.visibleLocations().has(locationId);
  }
}
