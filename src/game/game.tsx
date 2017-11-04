import * as ReactDOM from 'react-dom';
import * as React from 'react';
import Axios from 'axios';
import { Provider } from 'mobx-react';
import { when, useStrict } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';
import Root from 'game/components/Root';
import RootStore from 'game/stores';
import { VisibilityMode } from 'game/stores/game';
import { ViewData } from 'game/stores/phaser';

import TerritoryView from 'game/phaser/territory';
import { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

const stores = new RootStore();

(window as any).stores = stores;

Promise.all([
  Axios.get('/assets/maps/test.game.json'),
  Axios.get('/assets/maps/test.map.json'),
  Axios.get('/assets/maps/test.view.json')
])
  .then(responses => {
    const gameData: GameData = responses[0].data;
    const mapData: GameMapData = responses[1].data;
    const viewData: ViewData = responses[2].data;

    gameData.maps.push(mapData);

    stores.gameStore.setGame(gameData);

    stores.phaserStore.initialise(window, 'phaser-container');

    when(
      () => stores.phaserStore.phaser !== null,
      () => {
        stores.phaserStore.initialiseViews(stores, viewData);
        stores.gameStore.setVisibility(VisibilityMode.CURRENT_PLAYER);
        stores.gameStore.setCurrentPlayer(mapData.playerIds[0]);
      }
    );

    ReactDOM.render(
      <ThemeProvider>
        <Provider {...stores}>
          <Root />
        </Provider>
      </ThemeProvider>,
      document.getElementById('react-container')
    );
  });
