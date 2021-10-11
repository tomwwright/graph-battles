#!/usr/bin/env node

const fs = require("fs");
const seedInput = fs.readFileSync("/dev/stdin", "utf-8");

const seedList = JSON.parse(seedInput);

if (!Array.isArray(seedList)) {
  console.error('Input not valid JSON or is not an array of seed objects!');
  process.exit(1);
}

const map = {
  id: "generated-map",
  nextId: 0,
  type: "map",
  playerIds: [],
  territoryIds: [],
  edgeIds: [],
  unitIds: [],
  dataMap: {}
};

for (let i = 0; i < seedList.length; ++i) {
  const seed = seedList[i];

  switch (seed.type) {
    case "player":
      processPlayer(map, seed);
      break;
    case "territory":
      processTerritory(map, seed);
      break;
    case "edge":
      processEdge(map, seed);
      break;
  }
}

console.log(JSON.stringify(map));

function processPlayer(map, playerSeed) {
  const id = playerSeed.id;

  map.playerIds.push(id);
  map.dataMap[id] = {
    unitIds: [],
    territoryIds: [],
    colour: 0,
    gold: 0,
    goldProduction: 1,
    ready: false,
    neutralTerritoryCaptures: 0,
    opponentTerritoryCaptures: 0,
    unitsDestroyed: 0,
    ...playerSeed
  };
}

function processTerritory(map, territorySeed) {
  const id = territorySeed.id;

  const numUnits = territorySeed.numUnits;
  delete territorySeed.numUnits;

  map.territoryIds.push(id);
  const territory = {
    unitIds: [],
    food: 3,
    edgeIds: [],
    currentAction: null,
    properties: [],
    ...territorySeed
  };

  map.dataMap[id] = territory;

  if (territorySeed.playerId) {
    map.dataMap[territorySeed.playerId].territoryIds.push(id);
  }

  for (let i = 0; i < numUnits; ++i) {
    const unitId = '#U' + map.nextId;
    map.nextId++;

    map.unitIds.push(unitId);
    map.dataMap[id].unitIds.push(unitId);

    map.dataMap[unitId] = {
      type: "unit",
      id: unitId,
      playerId: territory.playerId || null,
      locationId: territory.id,
      destinationId: null,
      statuses: []
    };

    if (territory.playerId) {
      map.dataMap[territory.playerId].unitIds.push(unitId);
    }
  }
}

function processEdge(map, edgeSeed) {
  const id = edgeSeed.territoryAId + edgeSeed.territoryBId;

  map.edgeIds.push(id);
  map.dataMap[id] = {
    id: id,
    unitIds: [],
    ...edgeSeed
  };

  map.dataMap[edgeSeed.territoryAId].edgeIds.push(id);
  map.dataMap[edgeSeed.territoryBId].edgeIds.push(id);
}