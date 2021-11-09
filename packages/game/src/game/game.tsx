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
import { APIGameProvider } from 'game/providers/api';
import { MockGameProvider } from 'game/providers/mock';

import { GameData, GameMap, GameMapData, Utils } from '@battles/models';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

// create stores and attach to window (for debug)
const stores = new RootStore();
(window as any).stores = stores;

// parse the query string
type AppParameters = {
  gameId?: string;
  userId?: string;
  local?: string;
};

const params: AppParameters = QueryString.parse(location.search) as AppParameters;

try {
  if (params.gameId) {
    if (params.local === 'true') {
      startLocalGame(params.gameId, params.userId);
    } else {
      startRemoteGame(params.gameId, params.userId);
    }
  } else {
    startExampleGame();
  }
} catch (e) {
  console.error(e);

  ReactDOM.render(
    <p>Unable to load game '{params.gameId}', does it exist?</p>,
    document.getElementById('react-container')
  );
}

function startLocalGame(gameId: string, userId: string) {
  const savedGame = LocalStorage.loadGame(gameId);
  initialise(savedGame, LocalGameProvider.createProvider(savedGame.gameData.id, userId));
}

async function startRemoteGame(gameId: string, userId: string) {
  stores.uiStore.setFilteredUserIds([userId]);
  const provider = new APIGameProvider(gameId, userId);
  const game = await provider.get();
  const viewData = await provider.getViewData();
  const savedGame = {
    gameData: game.data,
    viewData: viewData,
    lastUpdated: Date.now(),
  };
  initialise(savedGame, provider);
}

async function startExampleGame() {
  const responses = await Promise.all([
    Axios.get('/assets/maps/test.game.json'),
    Axios.get('/assets/maps/test.map.json'),
    Axios.get('/assets/maps/test.view.json'),
  ]);

  const gameData: GameData = responses[0].data;
  const mapData: GameMapData = responses[1].data;
  const viewData: ViewData = responses[2].data;

  gameData.maps.push(mapData);

  const nextTurn = new GameMap(Utils.clone(mapData));
  nextTurn.resolveTurn();
  gameData.maps.push(nextTurn.data);

  initialise(
    {
      gameData,
      viewData,
      lastUpdated: Date.now(),
    },
    null
  );
}

function initialise(game: SavedGame, provider: GameProvider) {
  stores.phaserStore.initialise(window, 'phaser-container', stores.gameStore, stores.uiStore, game.viewData);
  stores.gameStore.setGame(game.gameData);
  stores.gameStore.setVisibility(VisibilityMode.NOT_VISIBLE);
  stores.gameStore.provider =
    provider || MockGameProvider.createProvider(game.gameData.id, 'xxx', stores.gameStore.game);

  when(
    'phaser is initialised',
    () => stores.phaserStore.phaser !== null,
    () => {
      stores.uiStore.setTurn(1);
      stores.uiStore.setFirstPlayer();

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
