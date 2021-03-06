import { TerritoryType, Status, TerritoryAction } from 'models/values';

export const SELECTED_ALPHA = 0.8;

export const TERRITORY_ASSET_PREFIX: string = 'territory-';
export const TERRITORY_ASSET_BACKDROP_SUFFIX: string = '-backdrop';
export const TERRITORY_VISIBILITY_OVERLAY_ALPHA = 0.5;

export const ASSET_PATH = '/assets/';

export const TerritoryAssetStrings: { [key: number]: string } = {
  [TerritoryType.UNSETTLED]: 'unsettled',
  [TerritoryType.SETTLED]: 'settled',
  [TerritoryType.CASTLE]: 'castle',
  [TerritoryType.CASTLE_FARM]: 'castle-farm',
  [TerritoryType.CITY]: 'city',
  [TerritoryType.CITY_FARM]: 'city-farm',
  [TerritoryType.CITY_FORT]: 'city-fort',
  [TerritoryType.CITY_FORT_FARM]: 'city-fort-farm',
  [TerritoryType.FARM]: 'farm',
  [TerritoryType.FORT]: 'fort',
  [TerritoryType.FORT_FARM]: 'fort-farm',
};

type StatusDefinition = {
  status: number;
  assetString: string;
  text: string;
};

export const StatusDefinitions: { [key: number]: StatusDefinition } = {
  [Status.DEFEND]: { status: Status.DEFEND, assetString: 'status-defend', text: 'Defending' },
  [Status.STARVE]: { status: Status.STARVE, assetString: 'status-starve', text: 'Starving' },
};

export const TerritoryActionTexts: { [key: number]: string } = {
  [TerritoryAction.CREATE_UNIT]: 'Create Unit',
  [TerritoryAction.BUILD_SETTLEMENT]: 'Build Settlement',
  [TerritoryAction.BUILD_FARM]: 'Build Farm',
  [TerritoryAction.BUILD_FORT]: 'Build Fort',
  [TerritoryAction.BUILD_CITY]: 'Build City',
  [TerritoryAction.BUILD_CASTLE]: 'Build Castle',
};

export const UNITS_PER_ROW = 3;
export const UNITS_SPACING = 0.2;
