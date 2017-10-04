import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { Provider } from 'mobx-react';
import GameStore from 'game/stores/gameStore';
import Root from 'game/components/root';

import { createMap } from 'models/map';

const stores = {
  game: new GameStore()
};

const mapData = require('../../../assets/map.json');

stores.game.map = createMap(mapData);

ReactDOM.render(
  <Provider game={stores.game}>
    <Root />
  </Provider>,
  document.getElementById("react-container"));
