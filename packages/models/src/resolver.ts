import { clone } from './utils';
import { GameMap } from './map';
import { Resolution } from './resolution';

export function* resolveTurn(map: GameMap): Generator<Resolution> {
  const previous = new GameMap(clone(map.data));

  // Remove defend status from all moving units before any moves are applied (no yield)
  for (const unit of map.units) {
    unit.resolveRemoveDefendStatus();
  }

  // Phase: initial moves — yield before applying so the UI sees the unit before it moves
  const initialMovingUnits = map.units.filter((unit) => unit.data.destinationId !== null && unit.movementEdge !== null);
  for (const unit of initialMovingUnits) {
    yield { phase: 'move', unitId: unit.data.id };
    unit.resolveMove();
  }

  // Loop: resolve safe-edge moves, then combats, until no combats remain
  while (true) {
    const safeEdgeUnits = map.units.filter(
      (unit) => unit.data.destinationId !== null && map.edge(unit.data.locationId) !== null && !unit.location.hasCombat()
    );
    for (const unit of safeEdgeUnits) {
      yield { phase: 'move', unitId: unit.data.id };
      unit.resolveMove();
    }

    const combats = map.getCombats();
    if (combats.length === 0) break;

    for (const combat of combats) {
      yield { phase: 'combat', locationId: combat.location.data.id };
      combat.resolve();
    }
  }

  // Phase: add defend status — yield before applying so the UI sees the unit without the status yet
  for (const unit of map.units) {
    const previousUnit = previous.unit(unit.data.id);
    yield { phase: 'add-defend', unitId: unit.data.id };
    unit.resolveAddDefendStatus(previousUnit);
  }

  // Phase: food production and consumption per territory
  for (const territory of map.territories) {
    yield { phase: 'food', territoryId: territory.data.id };
    territory.resolveFood();
  }

  // Phase: gold income per player
  for (const player of map.players) {
    yield { phase: 'gold', playerId: player.data.id };
    player.resolveGold();
  }

  // Phase: territory control — only territories with units present can change hands
  const populatedTerritories = map.territories.filter((territory) => territory.units.length > 0);
  for (const territory of populatedTerritories) {
    yield { phase: 'territory-control', territoryId: territory.data.id };
    territory.resolveTerritoryControl(previous.territory(territory.data.id));
  }

  // Phase: territory actions
  const territoriesWithActions = map.territories.filter((territory) => territory.data.currentAction != null);
  for (const territory of territoriesWithActions) {
    yield { phase: 'territory-action', territoryId: territory.data.id };
    territory.resolveTerritoryAction();
  }

  // Clear ready flags — no yield, runs when .next() is called after the last yield
  map.players.forEach((player) => (player.data.ready = false));
}
