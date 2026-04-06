import { Game, GameMap, ID, Resolution, Values } from '@battles/models';
import type { HexCoord } from '../rendering/HexCoordinates';

export type VisibilityMode = 'all' | 'current-player';

export type HoverInfo =
  | { type: 'territory'; territoryId: ID; hexCoord: HexCoord }
  | { type: 'edge'; territoryA: ID; territoryB: ID; hexCoord: HexCoord }
  | null;

export type StoreState = {
  // Game state
  game: Game;
  map: GameMap;
  currentPlayerId: ID;
  turn: number;

  // UI phase
  turnPhase: 'planning' | 'ready' | 'replaying' | 'victory';

  // Selection
  selectedUnitIds: ID[];
  selectedTerritoryId: ID | null;
  hover: HoverInfo;

  // Resolution replay
  currentResolution: Resolution | null;

  // Visibility
  visibilityMode: VisibilityMode;
};

export type UserActionDispatch = {
  onReadyPlayer(): void;
  onResolveNext(): void;
  onSetTurn(turn: number): void;
  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void;
  onCancelMove(unitIds: ID[]): void;
};
