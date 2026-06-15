import type { GameMapData, ID } from '@battles/models';
import type { HexCellMap } from './HexCellMap';

function setDiff<T>(a: Set<T>, b: Set<T>): T[] {
  return [...a].filter((x) => !b.has(x));
}

/**
 * Validate that the parsed HexCellMap (territory + edge layout from the v2 view
 * text) lines up with the authoritative GameMapData (territory + edge entries
 * in `dataMap`). Throws on any mismatch — this is a hand-crafted-data drift
 * detector, not a runtime recovery path.
 */
export function validateHexCellMap(map: HexCellMap, mapData: GameMapData): void {
  const renderTerritoryIds = new Set(map.territories().map((t) => t.id));
  const dataTerritoryIds = new Set<ID>();
  const dataEdgeIds = new Set<ID>();

  for (const entry of Object.values(mapData.dataMap)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as { type: string; id: ID };
    if (e.type === 'territory') dataTerritoryIds.add(e.id);
    else if (e.type === 'edge') dataEdgeIds.add(e.id);
  }

  const errors: string[] = [];

  const missingFromData = setDiff(renderTerritoryIds, dataTerritoryIds);
  const missingFromRender = setDiff(dataTerritoryIds, renderTerritoryIds);
  if (missingFromData.length > 0 || missingFromRender.length > 0) {
    errors.push(
      `Territory ID mismatch between HexCellMap and GameMapData. ` +
        `Missing from data: [${missingFromData.join(', ')}]. ` +
        `Missing from render: [${missingFromRender.join(', ')}].`
    );
  }

  const renderEdgeIds = new Set(map.edges().map((e) => e.id));
  const missingEdgesFromData = setDiff(renderEdgeIds, dataEdgeIds);
  const missingEdgesFromRender = setDiff(dataEdgeIds, renderEdgeIds);
  if (missingEdgesFromData.length > 0 || missingEdgesFromRender.length > 0) {
    errors.push(
      `Edge ID mismatch between HexCellMap and GameMapData. ` +
        `Missing from data: [${missingEdgesFromData.join(', ')}]. ` +
        `Missing from render: [${missingEdgesFromRender.join(', ')}].`
    );
  }

  if (errors.length > 0) throw new Error(errors.join(' '));
}
