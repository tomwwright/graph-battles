import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Text } from 'rebass';

import { RemoteGameComponent } from 'lobby/components/RemoteGameComponent';
import { RemoteGameStore } from 'lobby/stores/remotegame';

type RemoteGameListProps = {
  remoteGameStore?: RemoteGameStore;
  userId: string;
};
const RemoteGameListComponent: React.StatelessComponent<RemoteGameListProps> = ({ remoteGameStore, userId }) => (
  <div>
    {remoteGameStore.games.length == 0 ? (
      <Text>No games found.</Text>
    ) : (
      remoteGameStore.games.map((game) => <RemoteGameComponent key={game.gameId} game={game} userId={userId} />)
    )}
  </div>
);

export const RemoteGameList = inject('remoteGameStore')(observer(RemoteGameListComponent));
