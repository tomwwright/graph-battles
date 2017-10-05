import * as ReactDOM from "react-dom";
import * as React from "react";
import { Provider } from "mobx-react";
import { when } from "mobx";
import { Provider as ThemeProvider } from "rebass";
import GameStore from "game/stores/gameStore";
import UiStore from "game/stores/uiStore";
import Root from "game/components/Root";

import { initialisePhaser } from "game/phaser";
import { createMap } from "models/map";

const stores = {
  game: new GameStore(),
  ui: new UiStore()
};

const mapData = require("../../../assets/map.json");
stores.game.map = createMap(mapData);
stores.ui.selectUnit(stores.game.map.data.unitIds[0]);

initialisePhaser(window, "phaser-container", stores.ui);

when(
  () => stores.ui.isPhaserInitialised,
  () => {
    // phaser is ready!
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
