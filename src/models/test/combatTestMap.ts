import { GameMapData } from "models/map";
import { Status, TerritoryType, TerritoryProperty, TerritoryAction, propsToType, propsToActions } from "models/values";


const combatTestMap: GameMapData = {
  "id": "test-map",
  "type": "map",
  "nextId": 0,
  "playerIds": ["#PR", "#PB", "#PG"],
  "territoryIds": ["#T1", "#T2", "#T3", "#T4", "#T5"],
  "edgeIds": ["#E12", "#E13", "#E23", "#E34", "#E35", "#E45"],
  "unitIds": ["#UR1", "#UR2", "#UR3", "#UR4", "#UB1", "#UB2", "#UB3", "#UB4", "#UG1", "#U1"],
  "dataMap": {
    "#PR": {
      "id": "#PR",
      "type": "player",
      "colour": 16711680,
      "territoryIds": ["#T2"],
      "unitIds": ["#UR1", "#UR2", "#UR3", "#UR4"],
      "gold": 5,
      "goldProduction": 0,
      "ready": false,
      "neutralTerritoryCaptures": 1,
      "opponentTerritoryCaptures": 0,
      "unitsDestroyed": 1
    },
    "#PB": {
      "id": "#PB",
      "type": "player",
      "colour": 255,
      "territoryIds": ["#T1", "#T3"],
      "unitIds": ["#UB1", "#UB2", "#UB3", "#UB4"],
      "gold": 1,
      "goldProduction": 1,
      "ready": false,
      "neutralTerritoryCaptures": 1,
      "opponentTerritoryCaptures": 2,
      "unitsDestroyed": 3
    },
    "#PG": {
      "id": "#PG",
      "type": "player",
      "colour": 10027263,
      "territoryIds": ["#T5"],
      "unitIds": ["#UG1"],
      "gold": 10,
      "goldProduction": 2,
      "ready": false,
      "neutralTerritoryCaptures": 0,
      "opponentTerritoryCaptures": 0,
      "unitsDestroyed": 0
    },
    "#T1": {
      "id": "#T1",
      "type": "territory",
      "playerId": "#PB",
      "unitIds": ["#UR1", "#UR2", "#UR3"],
      "edgeIds": ["#E12", "#E13"],
      "food": 1,
      "properties": [TerritoryProperty.SETTLED, TerritoryProperty.FARM, TerritoryProperty.FORT, TerritoryProperty.CITY, TerritoryProperty.CASTLE],
      "currentAction": TerritoryAction.CREATE_UNIT
    },
    "#T2": {
      "id": "#T2",
      "type": "territory",
      "playerId": "#PR",
      "unitIds": ["#UR3"],
      "edgeIds": ["#E12", "#E23"],
      "food": 2,
      "properties": [],
      "currentAction": null
    },
    "#T3": {
      "id": "#T3",
      "type": "territory",
      "playerId": "#PB",
      "unitIds": ["#UB3"],
      "edgeIds": ["#E13", "#E23", "#E34", "#E35"],
      "food": 3,
      "properties": [],
      "currentAction": TerritoryAction.BUILD_SETTLEMENT
    },
    "#T4": {
      "id": "#T4",
      "type": "territory",
      "playerId": null,
      "unitIds": ["#UB4", "#UG1", "#U1"],
      "edgeIds": ["#E34", "#E45"],
      "food": 3,
      "properties": [TerritoryProperty.SETTLED, TerritoryProperty.CITY],
      "currentAction": null
    },
    "#T5": {
      "id": "#T5",
      "type": "territory",
      "playerId": "#PG",
      "unitIds": [],
      "edgeIds": ["#E35", "#E45"],
      "food": 3,
      "properties": [TerritoryProperty.SETTLED, TerritoryProperty.FARM],
      "currentAction": null
    },
    "#E12": {
      "id": "#E12",
      "type": "edge",
      "unitIds": [],
      "territoryAId": "#T1",
      "territoryBId": "#T2"
    },
    "#E13": {
      "id": "#E13",
      "type": "edge",
      "unitIds": [],
      "territoryAId": "#T1",
      "territoryBId": "#T3"
    },
    "#E23": {
      "id": "#E23",
      "type": "edge",
      "unitIds": ["#UR4", "#UB1", "#UB2"],
      "territoryAId": "#T2",
      "territoryBId": "#T3"
    },
    "#E34": {
      "id": "#E34",
      "type": "edge",
      "unitIds": [],
      "territoryAId": "#T3",
      "territoryBId": "#T4"
    },
    "#E35": {
      "id": "#E35",
      "type": "edge",
      "unitIds": [],
      "territoryAId": "#T3",
      "territoryBId": "#T5"
    },
    "#E45": {
      "id": "#E45",
      "type": "edge",
      "unitIds": [],
      "territoryAId": "#T4",
      "territoryBId": "#T5"
    },
    "#UR1": {
      "id": "#UR1",
      "type": "unit",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": null,
      "statuses": []
    },
    "#UR2": {
      "id": "#UR2",
      "type": "unit",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": null,
      "statuses": []
    },
    "#UR3": {
      "id": "#UR3",
      "type": "unit",
      "playerId": "#PR",
      "locationId": "#T2",
      "destinationId": null,
      "statuses": []
    },
    "#UR4": {
      "id": "#UR4",
      "type": "unit",
      "playerId": "#PR",
      "locationId": "#E23",
      "destinationId": "#T3",
      "statuses": []
    },
    "#UB1": {
      "id": "#UB1",
      "type": "unit",
      "playerId": "#PB",
      "locationId": "#E23",
      "destinationId": "#T2",
      "statuses": []
    },
    "#UB2": {
      "id": "#UB2",
      "type": "unit",
      "playerId": "#PB",
      "locationId": "#E23",
      "destinationId": "#T2",
      "statuses": []
    },
    "#UB3": {
      "id": "#UB3",
      "type": "unit",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": null,
      "statuses": [Status.STARVE]
    },
    "#UB4": {
      "id": "#UB4",
      "type": "unit",
      "playerId": "#PB",
      "locationId": "#T4",
      "destinationId": null,
      "statuses": [Status.STARVE]
    },
    "#UG1": {
      "id": "#UG1",
      "type": "unit",
      "playerId": "#PG",
      "locationId": "#T4",
      "destinationId": null,
      "statuses": []
    },
    "#U1": {
      "id": "#U1",
      "type": "unit",
      "playerId": null,
      "locationId": "#T4",
      "destinationId": null,
      "statuses": [Status.DEFEND]
    }
  }
};


export default combatTestMap;