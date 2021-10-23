import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { Provider } from 'mobx-react';
import { useStrict } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';
import * as QueryString from 'query-string';

import { RootStore } from 'lobby/stores';
import { Root } from 'lobby/containers/Root';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

// create stores and attach to window (for debug)
const stores = new RootStore();
(window as any).stores = stores;

// parse the query string
type AppParameters = {
  playerId?: string
};

const params: AppParameters = QueryString.parse(location.search) as AppParameters;

// render
ReactDOM.render(
  <ThemeProvider>
    <Provider {...stores}>
      <Root playerId={params.playerId}/>
    </Provider>
  </ThemeProvider>,
  document.getElementById('react-container')
);