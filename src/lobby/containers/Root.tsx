import * as React from "react";

import { NewGame } from 'lobby/containers/NewGame';
import { SavedGameList } from 'lobby/containers/SavedGameList';

export const Root: React.StatelessComponent<{}> = () => (
  <div>
    <NewGame />
    <SavedGameList />
  </div>
);