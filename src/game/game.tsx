import * as ReactDOM from 'react-dom';
import * as React from 'react';
import Axios from 'axios';
import { Provider } from 'mobx-react';
import { when, useStrict } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';
import * as QueryString from 'query-string';

import Root from 'game/components/Root';
import RootStore from 'game/stores';
import { VisibilityMode } from 'game/stores/game';
import { ViewData } from 'game/stores/phaser';
import { LocalGameProvider, LocalStorage } from 'game/providers/local';

import TerritoryView from 'game/phaser/territory';
import { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';
import { clone } from 'models/utils';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

const stores = new RootStore();

(window as any).stores = stores;

// parse the query string
type AppParameters = {
  gameId: string
};

const params: AppParameters = QueryString.parse(location.search);
let savedGame;
try {
  savedGame = LocalStorage.loadGame(params.gameId);
} catch (e) {
  console.error(e);
}

if (savedGame) {
  stores.phaserStore.initialise(window, 'phaser-container', stores.gameStore, stores.uiStore, savedGame.viewData);
  stores.gameStore.setGame(savedGame.gameData);
  stores.gameStore.setVisibility(VisibilityMode.NOT_VISIBLE);

  stores.uiStore.provider = LocalGameProvider.createProvider(savedGame.gameData.id, 'xxx')

  when(
    () => stores.phaserStore.phaser !== null,
    () => {
      stores.uiStore.setTurn(1);
      stores.uiStore.setPlayer(stores.gameStore.map.data.playerIds[0]);

      ReactDOM.render(
        <ThemeProvider>
          <Provider {...stores}>
            <Root />
          </Provider>
        </ThemeProvider>,
        document.getElementById('react-container')
      );
    }
  );
} else {
  ReactDOM.render(
    <p>Unable to load game '{params.gameId}', does it exist?</p>,
    document.getElementById('react-container')
  );
}
