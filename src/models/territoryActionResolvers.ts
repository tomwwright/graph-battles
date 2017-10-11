import { TerritoryProperty } from "models/values";
import GameMap from "models/map";
import Territory from "models/territory";
import { contains } from "models/utils";

export function onCreateUnit(map: GameMap, territory: Territory) {
  map.addUnit(territory);
}

export function onBuildSettlement(map: GameMap, territory: Territory) {
  territory.data.goldProduction += 1;
  territory.data.maxFood = 5;
  territory.addProperty(TerritoryProperty.SETTLED);
}

export function onBuildFarm(map: GameMap, territory: Territory) {
  territory.data.foodProduction += 1;
  territory.addProperty(TerritoryProperty.FARM);
  if (
    territory.data.maxFood == 5 &&
    (contains(territory.data.properties, TerritoryProperty.FORT) ||
      contains(territory.data.properties, TerritoryProperty.CITY))
  ) {
    territory.data.maxFood = 7;
  }
}

export function onBuildCity(map: GameMap, territory: Territory) {
  territory.data.goldProduction += 1;
  territory.addProperty(TerritoryProperty.CITY);
  if (
    territory.data.maxFood == 5 &&
    (contains(territory.data.properties, TerritoryProperty.FORT) ||
      contains(territory.data.properties, TerritoryProperty.FARM))
  ) {
    territory.data.maxFood = 7;
  }
}

export function onBuildFort(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.FORT);
  if (
    territory.data.maxFood == 5 &&
    (contains(territory.data.properties, TerritoryProperty.CITY) ||
      contains(territory.data.properties, TerritoryProperty.FARM))
  ) {
    territory.data.maxFood = 7;
  }
}

export function onBuildCastle(map: GameMap, territory: Territory) {
  territory.addProperty(TerritoryProperty.CASTLE);
  territory.data.maxFood = 10;
}
