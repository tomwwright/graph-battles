import { GameMapData } from "models/map";
import { Status, TerritoryType, TerritoryProperty, TerritoryAction, propsToType, propsToActions } from "models/values";


const testMap: GameMapData = {
  "id": "test-map",
  "nextId": 0,
  "playerIds": ["#PR", "#PB", "#PG"],
  "territoryIds": ["#T1", "#T2", "#T3", "#T4", "#T5"],
  "edgeIds": ["#E12", "#E13", "#E23", "#E34", "#E35", "#E45"],
  "unitIds": ["#UR1", "#UR2", "#UR3", "#UR4", "#UB1", "#UB2", "#UB3", "#UB4", "#UG1", "#U1"],
  "dataMap": {
    "#PR": {
      "id": "#PR",
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
      "playerId": "#PB",
      "unitIds": ["#UR1", "#UR2", "#UR3"],
      "edgeIds": ["#E12", "#E13"],
      "food": 1,
      "properties": [],
      "currentAction": TerritoryAction.BUILD_SETTLEMENT
    },
    "#T2": {
      "id": "#T2",
      "playerId": "#PR",
      "unitIds": ["#UR4"],
      "edgeIds": ["#E12", "#E23"],
      "food": 2,
      "properties": [],
      "currentAction": null
    },
    "#T3": {
      "id": "#T3",
      "playerId": "#PB",
      "unitIds": ["#UB1", "#UB2", "#UB3", "#UB4"],
      "edgeIds": ["#E13", "#E23", "#E34", "#E35"],
      "food": 3,
      "properties": [],
      "currentAction": TerritoryAction.BUILD_SETTLEMENT
    },
    "#T4": {
      "id": "#T4",
      "playerId": null,
      "unitIds": ["#U1"],
      "edgeIds": ["#E34", "#E45"],
      "food": 5,
      "properties": [],
      "currentAction": null
    },
    "#T5": {
      "id": "#T5",
      "playerId": "#PG",
      "unitIds": ["#UG1"],
      "edgeIds": ["#E35", "#E45"],
      "food": 0,
      "properties": [TerritoryProperty.SETTLED, TerritoryProperty.FARM],
      "currentAction": null
    },
    "#E12": {
      "id": "#E12",
      "unitIds": [],
      "territoryAId": "#T1",
      "territoryBId": "#T2"
    },
    "#E13": {
      "id": "#E13",
      "unitIds": [],
      "territoryAId": "#T1",
      "territoryBId": "#T3"
    },
    "#E23": {
      "id": "#E23",
      "unitIds": [],
      "territoryAId": "#T2",
      "territoryBId": "#T3"
    },
    "#E34": {
      "id": "#E34",
      "unitIds": [],
      "territoryAId": "#T3",
      "territoryBId": "#T4"
    },
    "#E35": {
      "id": "#E35",
      "unitIds": [],
      "territoryAId": "#T3",
      "territoryBId": "#T5"
    },
    "#E45": {
      "id": "#E45",
      "unitIds": [],
      "territoryAId": "#T4",
      "territoryBId": "#T5"
    },
    "#UR1": {
      "id": "#UR1",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": null,
      "statuses": [],
      "foodConsumption": 1
    },
    "#UR2": {
      "id": "#UR2",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": null,
      "statuses": [],
      "foodConsumption": 1
    },
    "#UR3": {
      "id": "#UR3",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": "#T2",
      "statuses": [],
      "foodConsumption": 1
    },
    "#UR4": {
      "id": "#UR4",
      "playerId": "#PR",
      "locationId": "#T2",
      "destinationId": "#T3",
      "statuses": [Status.DEFEND],
      "foodConsumption": 1
    },
    "#UB1": {
      "id": "#UB1",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": "#T2",
      "statuses": [],
      "foodConsumption": 1
    },
    "#UB2": {
      "id": "#UB2",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": "#T2",
      "statuses": [],
      "foodConsumption": 1
    },
    "#UB3": {
      "id": "#UB3",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": null,
      "statuses": [Status.STARVE],
      "foodConsumption": 1
    },
    "#UB4": {
      "id": "#UB4",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": "#T4",
      "statuses": [Status.STARVE],
      "foodConsumption": 1
    },
    "#UG1": {
      "id": "#UG1",
      "playerId": "#PG",
      "locationId": "#T5",
      "destinationId": "#T4",
      "statuses": [],
      "foodConsumption": 1
    },
    "#U1": {
      "id": "#U1",
      "playerId": null,
      "locationId": "#T4",
      "destinationId": null,
      "statuses": [Status.DEFEND],
      "foodConsumption": 1
    }
  }
};


export default testMap;