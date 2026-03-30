import { clone } from './utils';
import { GameMap } from './map';
import { Resolution } from './resolution';

export function* resolveTurn(map: GameMap): Generator<Resolution> {
  const previous = new GameMap(clone(map.data));

  resolveRemoveDefendStatus(map);

  for (const r of resolveMoves(map)) {
    yield r
  }

  for (const r of resolveMovesAndCombats(map)) {
    yield r;
  }

  for (const r of resolveAddDefendStatus(map, previous)) {
    yield r;
  }

  for (const r of resolveFood(map)) {
    yield r;
  }

  for (const r of resolveGold(map)) {
    yield r;
  }

  for (const r of resolveTerritoryControl(map, previous)) {
    yield r;
  }

  for (const r of resolveTerritoryActions(map)) {
    yield r;
  }

  unreadyPlayers(map);
}

export function resolveTurnSync(map: GameMap): Resolution[] {
  const resolutions = [];
  for (const r of resolveTurn(map)) {
    resolutions.push(r);
  }
  return resolutions;
}

export function* resolveGold(map: GameMap): Generator<Resolution> {
  for (const player of map.players) {
    yield { phase: 'gold', playerId: player.data.id };
    player.resolveGold();
  }
}

export function* resolveFood(map: GameMap): Generator<Resolution> {
  for (const territory of map.territories) {
    yield { phase: 'food', territoryId: territory.data.id };
    territory.resolveFood();
  }
}

function resolveRemoveDefendStatus(map: GameMap) {
  for (const unit of map.units) {
    unit.resolveRemoveDefendStatus();
  }
}

export function* resolveAddDefendStatus(map: GameMap, previous: GameMap): Generator<Resolution> {
  for (const unit of map.units) {
    const previousUnit = previous.unit(unit.data.id);
    yield { phase: 'add-defend', unitId: unit.data.id };
    unit.resolveAddDefendStatus(previousUnit);
  }
}

export function* resolveMoves(map: GameMap): Generator<Resolution> {
  // push all moving units onto their respective Edge
  const movingUnits = map.units.filter((unit) => unit.data.destinationId !== null && unit.movementEdge);
  for (const unit of movingUnits) {
    yield { phase: 'move', unitId: unit.data.id };
    unit.resolveMove();
  }

  // now safe edges can immediately be resolved
  const safeEdges = map.edges.filter((edge) => !edge.hasCombat());
  for (const edge of safeEdges) {
    for (const unit of edge.units) {
      yield { phase: 'move', unitId: unit.data.id };
      unit.resolveMove();
    }
  }
}

export function* resolveMovesAndCombats(map: GameMap): Generator<Resolution> {
  for (const r of resolveMoves(map)) {
    yield r;
  }

  let combats = map.getCombats();
  while (combats.length > 0) {
    for (const combat of combats) {
      yield { phase: 'combat', locationId: combat.location.data.id };
      combat.resolve();
    }

    for (const r of resolveMoves(map)) {
      yield r;
    }

    combats = map.getCombats();
  }
}

export function* resolveTerritoryActions(map: GameMap): Generator<Resolution> {
  const territoriesWithActions = map.territories.filter((territory) => territory.data.currentAction != null);
  for (const territory of territoriesWithActions) {
    yield { phase: 'territory-action', territoryId: territory.data.id };
    territory.resolveTerritoryAction();
  }
}

export function* resolveTerritoryControl(map: GameMap, previous: GameMap): Generator<Resolution> {
  const populatedTerritories = map.territories.filter((territory) => territory.units.length > 0);
  for (const territory of populatedTerritories) {
    yield { phase: 'territory-control', territoryId: territory.data.id };
    territory.resolveTerritoryControl(previous.territory(territory.data.id));
  }
}

export function* unreadyPlayers(map: GameMap) {
  map.players.forEach((player) => (player.data.ready = false));
}