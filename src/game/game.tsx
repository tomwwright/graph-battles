import * as ReactDOM from 'react-dom';
import * as React from 'react';
import Axios from 'axios';
import { Provider } from 'mobx-react';
import { when } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';
import Root from 'game/components/Root';
import RootStore from 'game/stores';
import { VisibilityMode } from 'game/stores/game';
import LocalGameProvider, { LocalStorage } from 'game/providers/local';

import { initialisePhaser, initialiseViews } from 'game/phaser';
import TerritoryView from 'game/phaser/territory';
import GameMap from 'models/map';

const stores = new RootStore();

(window as any).stores = stores;

Axios.get('/assets/game.json').then(response => {
  stores.gameStore.setGame(response.data);
  LocalStorage.saveGame(stores.gameStore.game);
  stores.gameStore.provider = LocalGameProvider.createProvider('test-game', 'User 1');

  initialisePhaser(window, 'phaser-container', stores);

  when(
    () => stores.phaserStore.isInitialised,
    () => {
      // phaser is ready!
      const positions = [{ x: 300, y: 300 }, { x: 550, y: 200 }, { x: 700, y: 400 }];
      initialiseViews(stores, positions);
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
