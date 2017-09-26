import { observable, action, computed } from "mobx";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as MobxReact from "mobx-react";

import { ID, HasID, IDMap } from "models/utils";
import { Game, createGame } from "models/game";
import { GameMap, GameMapData, createMap } from "models/map";
import { Territory, TerritoryData } from "models/territory";
import { Edge, EdgeData } from "models/edge";
import { Player, PlayerData } from "models/player";
import { Unit, UnitData } from "models/unit";
import { TerritoryType, Status } from "models/values";

class Store {
  @observable.ref game: Game;
  @observable.ref map: GameMap;
}

class App extends React.Component<{ store: Store }, void> {
  render() {
    let store = this.props.store;
    return (
      <MobxReact.Provider store={store}>
        <GameInfoContainer />
      </MobxReact.Provider>
    );
  }
}

type GameInfoProps = {
  store?: Store;
};

@MobxReact.inject("store")
@MobxReact.observer
class GameInfoContainer extends React.Component<GameInfoProps, void> {
  render() {
    return (
      <div>
        <p>
          Game ID: {store.game.id} ({store.game.users.length} users)
        </p>
        <p>
          Turn {store.game.turn}/{store.game.maxTurns} (to {store.game.maxVictoryPoints} victory points)
        </p>
        <p>Users</p>
        <ul>
          {store.game.users.map(user => <li>{`[${user.id}] name: ${user.name} players: ${user.playerIds.length}`}</li>)}
        </ul>
        <p>Players</p>
        <ul>
          {store.map.players.map(player => (
            <li>{`[${player.id}] gold: ${player.gold}/+${player.goldProduction} units: ${player.units.length}`}</li>
          ))}
        </ul>
        <p>Territories</p>
        <ul>
          {store.map.territories.map(territory => (
            <li>{`[${territory.id}] player: ${territory.player
              .id} food: ${territory.food}/${territory.foodProduction} units: ${territory.units.length}`}</li>
          ))}
        </ul>
        <p>Units</p>
        <ul>
          {store.map.units.map(unit => (
            <li>{`[${unit.id}] player: ${unit.player.id} location: ${unit.location.id} status: ${JSON.stringify(
              unit.statuses
            )}`}</li>
          ))}
        </ul>
      </div>
    );
  }
}

const store = new Store();

(window as any).store = store;

const players: PlayerData[] = [
  {
    id: "#0",
    territoryIds: ["#2"],
    unitIds: ["#5"],
    gold: 0,
    goldProduction: 1,
    ready: false,
    neutralTerritoryCaptures: 0,
    opponentTerritoryCaptures: 1,
    unitsDestroyed: 2
  },
  {
    id: "#1",
    territoryIds: ["#3"],
    unitIds: [],
    gold: 1,
    goldProduction: 0,
    ready: true,
    neutralTerritoryCaptures: 0,
    opponentTerritoryCaptures: 1,
    unitsDestroyed: 2
  }
];

const territories: TerritoryData[] = [
  {
    id: "#2",
    edgeIds: ["#4"],
    unitIds: ["#5"],
    playerId: "#0",
    food: 3,
    foodProduction: 1,
    maxFood: 5,
    goldProduction: 1,
    properties: [],
    actions: [],
    type: TerritoryType.UNSETTLED,
    currentAction: null
  },
  {
    id: "#3",
    edgeIds: ["#4"],
    unitIds: [],
    playerId: "#1",
    food: 5,
    foodProduction: 1,
    maxFood: 5,
    goldProduction: 0,
    properties: [],
    actions: [],
    type: TerritoryType.UNSETTLED,
    currentAction: null
  }
];

const edges: EdgeData[] = [
  {
    id: "#4",
    unitIds: [],
    territoryAId: "#2",
    territoryBId: "#3"
  }
];

const units: UnitData[] = [
  {
    id: "#5",
    playerId: "#0",
    locationId: "#2",
    destinationId: null,
    movementEdgeId: null,
    statuses: [Status.DEFEND],
    foodConsumption: 1
  }
];

let idMap: IDMap = new Map<ID, HasID>();
idMap.set(players[0].id, players[0]);
idMap.set(players[1].id, players[1]);
idMap.set(territories[0].id, territories[0]);
idMap.set(territories[1].id, territories[1]);
idMap.set(edges[0].id, edges[0]);
idMap.set(units[0].id, units[0]);

const map = createMap({
  playerIds: ["#0", "#1"],
  territoryIds: ["#2", "#3"],
  edgeIds: ["#4"],
  unitIds: ["#5"],
  nextId: 6,
  idMap
});

const game = createGame({
  id: "uuid",
  maxTurns: 10,
  maxVictoryPoints: 25,
  maps: [map],
  users: [
    {
      id: "uuid",
      name: "User #1",
      playerIds: ["#0"]
    },
    {
      id: "uuid",
      name: "User #2",
      playerIds: ["#1"]
    }
  ]
});

store.game = game;
store.map = map;

ReactDOM.render(<App store={store} />, document.getElementById("react-container"));
