import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Subhead } from 'rebass';

import { SavedGameComponent } from 'lobby/components/SavedGameComponent';

import { SavedGameStore } from 'lobby/stores/savedgame';

type SavedGameListProps = {
  savedGameStore?: SavedGameStore;
}
const SavedGameListComponent: React.StatelessComponent<SavedGameListProps> = ({ savedGameStore }) => (
  <div>
    <Subhead>Saved Games</Subhead>
    {savedGameStore.games.map(game => <SavedGameComponent key={game.gameData.id} game={game} linkUrl='/assets/html/index.html?gameId=' onDelete={() => savedGameStore.delete(game.gameData.id)} />)}
  </div>
);

export const SavedGameList = inject('savedGameStore')(observer(SavedGameListComponent));