import * as ReactDOM from 'react-dom';
import * as React from 'react';
import Axios from 'axios';
import { Provider } from 'mobx-react';
import { when, useStrict } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';
import Root from 'game/components/root';
import RootStore from 'game/stores';
import { VisibilityMode } from 'game/stores/game';

import TerritoryView from 'game/phaser/territory';
import GameMap from 'models/map';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

const stores = new RootStore();

(window as any).stores = stores;

Axios.get('/assets/game.json').then(response => {
  stores.gameStore.setGame(response.data);

  stores.phaserStore.initialise(window, 'phaser-container');

  when(
    () => stores.phaserStore.phaser !== null,
    () => {
      // phaser is ready!
      const positions = [{ x: 300, y: 300 }, { x: 550, y: 200 }, { x: 700, y: 400 }];
      stores.phaserStore.initialiseViews(stores, positions);
      stores.gameStore.setVisibility(VisibilityMode.VISIBLE);
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
