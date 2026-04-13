import { RemoteGameCard } from './RemoteGameCard';
import { useRemoteGames } from '../hooks/useRemoteGames';
import { usePlayerName } from '../hooks/usePlayerName';
import type { ClientVersion } from '../types';
import { getGameUrl } from '../util';

type RemoteGameListProps = {
  clientVersion: ClientVersion;
};

export function RemoteGameList({ clientVersion }: RemoteGameListProps) {
  const { games, loading, error } = useRemoteGames();
  const [playerName] = usePlayerName();

  const gamesWithUser = games.filter((game) =>
    game.leaderboard.some((leader) => leader.name === playerName)
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading games: {error.message}</p>;
  if (gamesWithUser.length === 0) return <p>No games found.</p>;

  return (
    <div>
      {gamesWithUser.map((game) => (
        <RemoteGameCard
          key={game.gameId}
          game={game}
          onOpen={() =>
            window.open(getGameUrl(clientVersion, game.gameId, playerName), '_blank')
          }
        />
      ))}
    </div>
  );
}
