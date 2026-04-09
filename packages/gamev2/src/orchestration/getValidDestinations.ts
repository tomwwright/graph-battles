import { ID, GameMap } from '@battles/models';

/**
 * Compute the set of territory IDs that all the given units can move to.
 * Returns the intersection of adjacent territories across every unit.
 */
export function getValidDestinations(map: GameMap, unitIds: ID[]): ID[] {
  const units = unitIds.map((id) => map.unit(id)).filter((u) => u != null);
  if (units.length === 0) return [];

  const territories = units.map((u) => {
    const loc = u.location;
    return loc?.data.type === 'territory' ? loc : null;
  });
  if (territories.some((t) => t == null)) return [];

  const adjacentSets = territories.map((t) =>
    (t as any).edges.map((edge: any) => edge.other(t).data.id) as ID[]
  );

  let result = adjacentSets[0] ?? [];
  for (let i = 1; i < adjacentSets.length; i++) {
    const set = new Set(adjacentSets[i]);
    result = result.filter((id) => set.has(id));
  }

  return result;
}
