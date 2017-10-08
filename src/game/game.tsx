import * as ReactDOM from "react-dom";
import * as React from "react";
import { Provider } from "mobx-react";
import { when } from "mobx";
import { Provider as ThemeProvider } from "rebass";
import GameStore from "game/stores/gameStore";
import UiStore from "game/stores/uiStore";
import Root from "game/components/Root";

import { initialisePhaser } from "game/phaser";
import TerritoryView from "game/phaser/territory";
import { createMap } from "models/map";

const stores = {
  game: new GameStore(),
  ui: new UiStore()
};

(window as any).stores = stores;

const mapData = require("../../../assets/map.json");
stores.game.map = createMap(mapData);
stores.ui.selectUnit(stores.game.map.data.unitIds[0]);

initialisePhaser(window, "phaser-container", stores.ui);

when(
  () => stores.ui.isPhaserInitialised,
  () => {
    // phaser is ready!
    const positions = [{ x: 300, y: 300 }, { x: 500, y: 200 }, { x: 700, y: 400 }];
    for (let i = 0; i < stores.game.map.territories.length; ++i) {
      const view = new TerritoryView(
        stores.ui.phaser,
        stores.game,
        stores.game.map.territories[i].data.id,
        positions[i].x,
        positions[i].y
      );
    }
  }
);

ReactDOM.render(
  <ThemeProvider>
    <Provider {...stores}>
      <Root />
    </Provider>
  </ThemeProvider>,
  document.getElementById("react-container")
);
