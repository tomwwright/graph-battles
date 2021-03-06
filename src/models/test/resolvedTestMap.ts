import { GameMapData } from "models/map";
import { Status, TerritoryType, TerritoryProperty, TerritoryAction, propsToType, propsToActions } from "models/values";


const testMap: GameMapData = {
  "id": "test-map",
  "type": "map",
  "nextId": 0,
  "playerIds": ["#PR", "#PB", "#PG"],
  "territoryIds": ["#T1", "#T2", "#T3", "#T4", "#T5"],
  "edgeIds": ["#E12", "#E13", "#E23", "#E34", "#E35", "#E45"],
  "unitIds": ["#UR1", "#UR2", "#UB3", "#U1"],
  "dataMap": {
    "#PR": {
      "id": "#PR",
      "type": "player",
      "colour": 16711680,
      "territoryIds": ["#T2", "#T1"],
      "unitIds": ["#UR1", "#UR2"],
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
      "territoryIds": ["#T3"],
      "unitIds": ["#UB3"],
      "gold": 4,
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
      "unitIds": [],
      "gold": 13,
      "goldProduction": 2,
      "ready": false,
      "neutralTerritoryCaptures": 0,
      "opponentTerritoryCaptures": 0,
      "unitsDestroyed": 0
    },
    "#T1": {
      "id": "#T1",
      "type": "territory",
      "playerId": "#PR",
      "unitIds": ["#UR1", "#UR2"],
      "edgeIds": ["#E12", "#E13"],
      "food": 0,
      "properties": [TerritoryProperty.SETTLED, TerritoryProperty.FARM, TerritoryProperty.FORT, TerritoryProperty.CITY, TerritoryProperty.CASTLE],
      "currentAction": null
    },
    "#T2": {
      "id": "#T2",
      "type": "territory",
      "playerId": "#PR",
      "unitIds": [],
      "edgeIds": ["#E12", "#E23"],
      "food": 3,
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
      "properties": [TerritoryProperty.SETTLED],
      "currentAction": null
    },
    "#T4": {
      "id": "#T4",
      "type": "territory",
      "playerId": null,
      "unitIds": ["#U1"],
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
      "food": 5,
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
      "unitIds": [],
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
      "statuses": [Status.DEFEND]
    },
    "#UR2": {
      "id": "#UR2",
      "type": "unit",
      "playerId": "#PR",
      "locationId": "#T1",
      "destinationId": null,
      "statuses": [Status.DEFEND]
    },
    "#UB3": {
      "id": "#UB3",
      "type": "unit",
      "playerId": "#PB",
      "locationId": "#T3",
      "destinationId": null,
      "statuses": [Status.DEFEND]
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


export default testMap;