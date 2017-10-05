import { GameMap } from "models/map";
import { Territory } from "models/territory";
import * as TerritoryActionResolvers from "models/territoryActionResolvers";

export enum Colour {
  BLACK = 0x000000,
  WHITE = 0xffffff,
  RED = 0xff0000,
  BLUE = 0x0000ff,
  GREEN = 0x00ff00,
  PURPLE = 0x9900ff,
  YELLOW = 0xffff00,
  ORANGE = 0xff9900
}

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

export const TerritoryPropertyMappings: { [key: number]: TerritoryProperty[] } = {
  [TerritoryType.UNSETTLED]: [],
  [TerritoryType.SETTLED]: [TerritoryProperty.SETTLED],
  [TerritoryType.CITY]: [TerritoryProperty.SETTLED, TerritoryProperty.CITY],
  [TerritoryType.FARM]: [TerritoryProperty.SETTLED, TerritoryProperty.FARM],
  [TerritoryType.FORT]: [TerritoryProperty.SETTLED, TerritoryProperty.FORT],
  [TerritoryType.FORT_FARM]: [TerritoryProperty.SETTLED, TerritoryProperty.FORT, TerritoryProperty.FARM],
  [TerritoryType.CITY_FARM]: [TerritoryProperty.SETTLED, TerritoryProperty.CITY, TerritoryProperty.FARM],
  [TerritoryType.CITY_FORT]: [TerritoryProperty.SETTLED, TerritoryProperty.CITY, TerritoryProperty.FORT],
  [TerritoryType.CITY_FORT_FARM]: [
    TerritoryProperty.SETTLED,
    TerritoryProperty.CITY,
    TerritoryProperty.FORT,
    TerritoryProperty.FARM
  ],
  [TerritoryType.CASTLE]: [
    TerritoryProperty.SETTLED,
    TerritoryProperty.CITY,
    TerritoryProperty.FORT,
    TerritoryProperty.CASTLE
  ],
  [TerritoryType.CASTLE_FARM]: [
    TerritoryProperty.SETTLED,
    TerritoryProperty.CITY,
    TerritoryProperty.FORT,
    TerritoryProperty.CASTLE,
    TerritoryProperty.FARM
  ]
};

export const TerritoryTypeCheckOrder: TerritoryType[] = [
  TerritoryType.CASTLE_FARM,
  TerritoryType.CASTLE,
  TerritoryType.CITY_FORT_FARM,
  TerritoryType.CITY_FORT,
  TerritoryType.CITY_FARM,
  TerritoryType.FORT_FARM,
  TerritoryType.FORT,
  TerritoryType.FARM,
  TerritoryType.CITY,
  TerritoryType.SETTLED,
  TerritoryType.UNSETTLED
];

export type TerritoryActionResolver = (map: GameMap, territory: Territory) => void;

export type TerritoryActionDefinition = {
  action: TerritoryAction;
  actionFunction: TerritoryActionResolver;
  cost: { food: number; gold: number };
};

export const TerritoryActionDefinitions: { [key: number]: TerritoryActionDefinition } = {
  [TerritoryAction.CREATE_UNIT]: {
    action: TerritoryAction.CREATE_UNIT,
    cost: { food: 3, gold: 0 },
    actionFunction: TerritoryActionResolvers.onCreateUnit
  },
  [TerritoryAction.BUILD_FARM]: {
    action: TerritoryAction.BUILD_FARM,
    cost: { food: 1, gold: 1 },
    actionFunction: TerritoryActionResolvers.onBuildFarm
  },
  [TerritoryAction.BUILD_SETTLEMENT]: {
    action: TerritoryAction.BUILD_SETTLEMENT,
    cost: { food: 0, gold: 3 },
    actionFunction: TerritoryActionResolvers.onBuildSettlement
  },
  [TerritoryAction.BUILD_CITY]: {
    action: TerritoryAction.BUILD_CITY,
    cost: { food: 2, gold: 5 },
    actionFunction: TerritoryActionResolvers.onBuildCity
  },
  [TerritoryAction.BUILD_FORT]: {
    action: TerritoryAction.BUILD_FORT,
    cost: { food: 2, gold: 5 },
    actionFunction: TerritoryActionResolvers.onBuildFort
  },
  [TerritoryAction.BUILD_CASTLE]: {
    action: TerritoryAction.BUILD_CASTLE,
    cost: { food: 3, gold: 10 },
    actionFunction: TerritoryActionResolvers.onBuildCastle
  }
};
