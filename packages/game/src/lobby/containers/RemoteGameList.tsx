import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Text } from 'rebass';

import { RemoteGameComponent } from 'lobby/components/RemoteGameComponent';
import { RemoteGameStore } from 'lobby/stores/remotegame';

type RemoteGameListProps = {
  remoteGameStore?: RemoteGameStore;
  userId: string;
};
const RemoteGameListComponent: React.StatelessComponent<RemoteGameListProps> = ({ remoteGameStore, userId }) => {
  const gamesWithUser = remoteGameStore.games.filter((game) =>
    game.leaderboard.map((leader) => leader.name).includes(userId)
  );

  return (
    <div>
      {gamesWithUser.length == 0 ? (
        <Text>No games found.</Text>
      ) : (
        gamesWithUser.map((game) => <RemoteGameComponent key={game.gameId} game={game} userId={userId} />)
      )}
    </div>
  );
};

export const RemoteGameList = inject('remoteGameStore')(observer(RemoteGameListComponent));
