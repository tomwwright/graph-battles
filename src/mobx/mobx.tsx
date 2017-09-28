import { observable, action, computed } from "mobx";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as MobxReact from "mobx-react";


import { ID, HasID, IDMap, clone } from "models/utils";
import { GameMap, GameMapData, createMap } from "models/map";
import { Territory, TerritoryData } from "models/territory";
import { Unit, UnitData } from "models/unit";
import { TerritoryType, Status } from "models/values";



class Store {
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
        <p>Territories</p>
        <ul>
          {store.map.territories.map(territory => (
            <li>{`[${territory.data.id}] food: ${territory.data.food}/${territory.data.foodProduction} units: ${territory.units.length}`}</li>
          ))}
        </ul>
        <p>Units</p>
        <ul>
          {store.map.units.map(unit => (
            <li>{`[${unit.data.id}] location: ${unit.location.data.id} status: ${JSON.stringify(
              unit.data.statuses
            )}`}</li>
          ))}
        </ul>
      </div>
    );
  }
}

const store = new Store();

(window as any).global = {
  store,
  createMap
};

const mapData = require('../../../assets/map.json');

store.map = createMap(mapData);

ReactDOM.render(<App store={store} />, document.getElementById("react-container"));
