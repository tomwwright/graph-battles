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
import { GameProvider } from 'game/providers/base';
import { LocalGameProvider, SavedGame, LocalStorage } from 'game/providers/local';
import { MockGameProvider } from 'game/providers/mock';

import TerritoryView from 'game/phaser/territory';
import { GameData } from 'models/game';
import GameMap, { GameMapData } from 'models/map';
import { clone } from 'models/utils';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

// create stores and attach to window (for debug)
const stores = new RootStore();
(window as any).stores = stores;

// parse the query string
type AppParameters = {
  gameId: string
};
const params: AppParameters = QueryString.parse(location.search);

// load a saved game, or load our mock game
let savedGame: SavedGame;

if (params.gameId) {
  try {
    savedGame = LocalStorage.loadGame(params.gameId);
    initialise(savedGame, LocalGameProvider.createProvider(savedGame.gameData.id, 'xxx'));
  } catch (e) {
    console.error(e);

    ReactDOM.render(
      <p>Unable to load game '{params.gameId}', does it exist?</p>,
      document.getElementById('react-container')
    );
  }
} else {
  Promise.all([
    Axios.get('/assets/maps/test.game.json'),
    Axios.get('/assets/maps/test.map.json'),
    Axios.get('/assets/maps/test.view.json')
  ]).then(responses => {
    const gameData: GameData = responses[0].data;
    const mapData: GameMapData = responses[1].data;
    const viewData: ViewData = responses[2].data;

    gameData.maps.push(mapData);

    const nextTurn = new GameMap(clone(mapData));
    nextTurn.resolveTurn();
    gameData.maps.push(nextTurn.data);

    initialise({
      gameData,
      viewData,
      lastUpdated: Date.now()
    }, null);
  });
}

function initialise(game: SavedGame, provider: GameProvider) {
  stores.phaserStore.initialise(window, 'phaser-container', stores.gameStore, stores.uiStore, game.viewData);
  stores.gameStore.setGame(game.gameData);
  stores.gameStore.setVisibility(VisibilityMode.NOT_VISIBLE);
  stores.gameStore.provider = provider || MockGameProvider.createProvider(game.gameData.id, 'xxx', stores.gameStore.game);

  when('phaser is initialised',
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
}