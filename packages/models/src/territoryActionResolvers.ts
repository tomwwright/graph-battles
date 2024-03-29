import { TerritoryProperty } from './values';
import { GameMap } from './map';
import { Territory } from './territory';
import { unique } from './utils';

export function onCreateUnit(map: GameMap, territory: Territory) {
  const presentPlayerIds = unique(territory.units.map((unit) => unit.data.playerId)).filter((id) => !!id);
  const onlyControllingPlayerPresent = presentPlayerIds.every((playerId) => playerId === territory.player.data.id);
  if (onlyControllingPlayerPresent) {
    map.addUnit(territory);
  }
}

export function onBuildSettlement(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.SETTLED);
}

export function onBuildFarm(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.FARM);
}

export function onBuildCity(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.CITY);
}

export function onBuildFort(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.FORT);
}

export function onBuildCastle(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.CASTLE);
}
