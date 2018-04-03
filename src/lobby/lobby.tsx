import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { Provider } from 'mobx-react';
import { useStrict } from 'mobx';
import { Provider as ThemeProvider } from 'rebass';

import { RootStore } from 'lobby/stores';
import { Root } from 'lobby/components/Root';

// enable Mobx strict mode (no state mutation outside of @action)
useStrict(true);

// create stores and attach to window (for debug)
const stores = new RootStore();
(window as any).stores = stores;

// render
ReactDOM.render(
  <ThemeProvider>
    <Provider {...stores}>
      <Root />
    </Provider>
  </ThemeProvider>,
  document.getElementById('react-container')
);