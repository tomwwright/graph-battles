import { Values } from '@battles/models';

export const SELECTED_ALPHA = 0.8;

export const TERRITORY_ASSET_PREFIX: string = 'territory-';
export const TERRITORY_ASSET_BACKDROP_SUFFIX: string = '-backdrop';
export const TERRITORY_VISIBILITY_OVERLAY_ALPHA = 0.5;

export const ASSET_PATH = '/assets/';

export const TerritoryAssetStrings: { [key: number]: string } = {
  [Values.TerritoryType.UNSETTLED]: 'unsettled',
  [Values.TerritoryType.SETTLED]: 'settled',
  [Values.TerritoryType.CASTLE]: 'castle',
  [Values.TerritoryType.CASTLE_FARM]: 'castle-farm',
  [Values.TerritoryType.CITY]: 'city',
  [Values.TerritoryType.CITY_FARM]: 'city-farm',
  [Values.TerritoryType.CITY_FORT]: 'city-fort',
  [Values.TerritoryType.CITY_FORT_FARM]: 'city-fort-farm',
  [Values.TerritoryType.FARM]: 'farm',
  [Values.TerritoryType.FORT]: 'fort',
  [Values.TerritoryType.FORT_FARM]: 'fort-farm',
};

type StatusDefinition = {
  status: number;
  assetString: string;
  text: string;
};

export const StatusDefinitions: { [key: number]: StatusDefinition } = {
  [Values.Status.DEFEND]: { status: Values.Status.DEFEND, assetString: 'status-defend', text: 'Defending' },
  [Values.Status.STARVE]: { status: Values.Status.STARVE, assetString: 'status-starve', text: 'Starving' },
};

export const TerritoryActionTexts: { [key: number]: string } = {
  [Values.TerritoryAction.CREATE_UNIT]: 'Create Unit',
  [Values.TerritoryAction.BUILD_SETTLEMENT]: 'Build Settlement',
  [Values.TerritoryAction.BUILD_FARM]: 'Build Farm',
  [Values.TerritoryAction.BUILD_FORT]: 'Build Fort',
  [Values.TerritoryAction.BUILD_CITY]: 'Build City',
  [Values.TerritoryAction.BUILD_CASTLE]: 'Build Castle',
};

export const UNITS_PER_ROW = 3;
export const UNITS_SPACING = 0.2;
