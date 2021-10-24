import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Text } from 'rebass';

import { RemoteGameComponent } from 'lobby/components/RemoteGameComponent';
import { RemoteGameStore } from 'lobby/stores/remotegame';

type RemoteGameListProps = {
  remoteGameStore?: RemoteGameStore;
  playerId: string;
};
const RemoteGameListComponent: React.StatelessComponent<RemoteGameListProps> = ({ remoteGameStore, playerId }) => (
  <div>
    {remoteGameStore.games.length == 0 ? (
      <Text>No games found.</Text>
    ) : (
      remoteGameStore.games.map((game) => <RemoteGameComponent key={game.gameId} game={game} playerId={playerId} />)
    )}
  </div>
);

export const RemoteGameList = inject('remoteGameStore')(observer(RemoteGameListComponent));