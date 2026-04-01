import { clone, sum, clamp, unique } from './utils';
import { GameMap, PendingActionType } from './map';
import { Resolution } from './resolution';
import { Status, TerritoryActionDefinitions } from './values';

export function* resolveTurn(map: GameMap): Generator<Resolution> {
  const previous = new GameMap(clone(map.data));

  resolveRemoveDefendStatus(map);

  for (const r of resolveMoves(map)) {
    yield r;
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
    player.data.gold += player.data.goldProduction + sum(player.territories.map((territory) => territory.goldProduction));
  }
}

export function* resolveFood(map: GameMap): Generator<Resolution> {
  for (const territory of map.territories) {
    yield { phase: 'food', territoryId: territory.data.id };

    territory.data.food += territory.foodProduction;

    const consumedFood = sum(territory.units.map((unit) => unit.foodConsumption));
    territory.data.food -= consumedFood;
    for (const unit of territory.units) {
      if (territory.data.food < 0) unit.addStatus(Status.STARVE);
      else unit.removeStatus(Status.STARVE);
    }

    territory.data.food = clamp(territory.data.food, 0, territory.maxFood);
  }
}

export function resolveRemoveDefendStatus(map: GameMap) {
  for (const unit of map.units) {
    if (unit.destinationId) unit.removeStatus(Status.DEFEND);
  }
}

export function* resolveAddDefendStatus(map: GameMap, previous: GameMap): Generator<Resolution> {
  for (const unit of map.units) {
    const previousUnit = previous.unit(unit.data.id);
    if (previousUnit && !previousUnit.destinationId) {
      yield { phase: 'add-defend', unitId: unit.data.id };
      unit.addStatus(Status.DEFEND);
    }
  }
}

export function* resolveMoves(map: GameMap): Generator<Resolution> {
  // push units from territories onto their respective Edge (only territory-based units, not those already on edges)
  const movingUnits = map.units.filter(
    (unit) => unit.destinationId !== null && unit.movementEdge && !map.edge(unit.data.locationId)
  );
  for (const unit of movingUnits) {
    yield { phase: 'move', unitId: unit.data.id };
    resolveUnitMove(map, unit.data.id);
  }

  // now safe edges can immediately be resolved
  const safeEdges = map.edges.filter((edge) => !edge.hasCombat());
  for (const edge of safeEdges) {
    for (const unit of edge.units) {
      yield { phase: 'move', unitId: unit.data.id };
      resolveUnitMove(map, unit.data.id);
    }
  }
}

/** Move a unit one step toward its destination (territory→edge or edge→territory) */
function resolveUnitMove(map: GameMap, unitId: string) {
  const unit = map.unit(unitId);
  const destId = unit.destinationId;
  if (!destId) throw new Error(`Unit ${unitId} moving without destination set`);
  if (!unit.destination) throw new Error(`Unit ${unitId} moving with invalid destination set: ${destId}`);
  if (!unit.movementEdge) throw new Error(`Unit ${unitId} moving to non-adjacent destination: ${destId}`);

  if (unit.data.locationId === unit.movementEdge.data.id) {
    // On the edge — move to destination territory and clear pending move
    unit.data.locationId = unit.destination.data.id;
    map.data.pendingActions = map.data.pendingActions.filter(
      (a) => !(a.type === PendingActionType.MOVE && a.unitId === unitId)
    );
  } else {
    // On a territory — move to the edge
    unit.data.locationId = unit.movementEdge.data.id;
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
  const territoryActions = map.data.pendingActions.filter((a) => a.type === PendingActionType.TERRITORY);
  for (const pending of territoryActions) {
    if (pending.type !== PendingActionType.TERRITORY) continue;
    const territory = map.territory(pending.territoryId);
    if (territory) {
      yield { phase: 'territory-action', territoryId: territory.data.id };
      const actionDefinition = TerritoryActionDefinitions[pending.action];
      actionDefinition.actionFunction(map, territory);
    }
  }
  // Clear all pending territory actions
  map.data.pendingActions = map.data.pendingActions.filter((a) => a.type !== PendingActionType.TERRITORY);
}

export function* resolveTerritoryControl(map: GameMap, previous: GameMap): Generator<Resolution> {
  const populatedTerritories = map.territories.filter((territory) => territory.units.length > 0);
  for (const territory of populatedTerritories) {
    const previousTerritory = previous.territory(territory.data.id);
    yield { phase: 'territory-control', territoryId: territory.data.id };

    const presentPlayerIds = unique(territory.units.map((unit) => unit.data.playerId)).filter((id) => id != null);
    const previousPlayerIds = unique(previousTerritory.units.map((unit) => unit.data.playerId)).filter((id) => id != null);

    if (
      presentPlayerIds.length == 1 &&
      previousPlayerIds.length == 1 &&
      presentPlayerIds[0] === previousPlayerIds[0] &&
      presentPlayerIds[0] !== territory.data.playerId
    ) {
      territory.data.playerId = presentPlayerIds[0];
      // Clear any pending territory action for this territory on control change
      map.data.pendingActions = map.data.pendingActions.filter(
        (a) => !(a.type === PendingActionType.TERRITORY && a.territoryId === territory.data.id)
      );
    }
  }
}

export function unreadyPlayers(map: GameMap) {
  map.data.pendingActions = map.data.pendingActions.filter((a) => a.type !== PendingActionType.READY);
}
