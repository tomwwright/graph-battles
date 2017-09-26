export enum Status {
  DEFEND,
  STARVE
}

export enum TerritoryAction {
  CREATE_UNIT,
  BUILD_SETTLEMENT,
  BUILD_FARM,
  BUILD_CITY,
  BUILD_FORT,
  BUILD_CASTLE
}

export enum TerritoryProperty {
  SETTLED,
  FARM,
  CITY,
  FORT,
  CASTLE
}

export enum TerritoryType {
  UNSETTLED,
  SETTLED,
  CASTLE,
  CASTLE_FARM,
  CITY,
  CITY_FARM,
  CITY_FORT,
  CITY_FORT_FARM,
  FARM,
  FORT,
  FORT_FARM
}
