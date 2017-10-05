import * as ReactDOM from "react-dom";
import * as React from "react";
import { Provider } from "mobx-react";
import { Provider as ThemeProvider } from "rebass";
import GameStore from "game/stores/gameStore";
import UiStore from "game/stores/uiStore";
import Root from "game/components/Root";

import { createMap } from "models/map";

const stores = {
  game: new GameStore(),
  ui: new UiStore()
};

const mapData = require("../../../assets/map.json");

stores.game.map = createMap(mapData);

stores.ui.selectedUnitId = stores.game.map.data.unitIds[0];

ReactDOM.render(
  <ThemeProvider>
    <Provider {...stores}>
      <Root />
    </Provider>
  </ThemeProvider>,
  document.getElementById("react-container")
);
