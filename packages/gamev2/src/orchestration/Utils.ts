import { GameMap, ID } from "@battles/models";


/**
 * Compute the set of territory IDs that all the given units can move to.
 * Returns the intersection of adjacent territories across every unit.
 * Units must all be on territories (not edges) to have valid destinations.
 */
export function getValidDestinations(map: GameMap, unitIds: ID[]): ID[] {
  const units = unitIds.map((id) => map.unit(id)).filter((u) => u != null);
  if (units.length === 0) return [];

  const destinations = [];

  const unitDestinations = units.map(u => u.possibleDestinations.map(d => d.data.id)).map(d => new Set(d));

  for (const destinationId of unitDestinations[0].values()) {
    if (unitDestinations.every(d => d.has(destinationId))) {
      destinations.push(destinationId);
    }
  }

  return destinations;
}

/**
 * Check whether a specific unit is visible to the given player.
 * A unit is visible if it occupies a visible location or has a pending
 * move to/from a visible location.
 */
export function isUnitVisible(map: GameMap, playerId: ID, unitId: ID): boolean {
  const unit = map.unit(unitId);
  if (!unit) return false;

  return unit.isVisible(playerId);
}

/**
 * Check whether a specific location is visible to the given player.
 */
export function isLocationVisible(map: GameMap, playerId: ID, locationId: ID): boolean {
  const location = map.territory(locationId) ?? map.edge(locationId);
  if (!location) {
    return false;
  }
  return location.isVisible(playerId);
}
