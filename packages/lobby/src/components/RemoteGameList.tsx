import { RemoteGameCard } from './RemoteGameCard';
import { useRemoteGames } from '../hooks/useRemoteGames';

type RemoteGameListProps = {
  userId: string;
};

export function RemoteGameList({ userId }: RemoteGameListProps) {
  const { games, loading, error } = useRemoteGames();

  const gamesWithUser = games.filter((game) =>
    game.leaderboard.some((leader) => leader.name === userId)
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading games: {error.message}</p>;
  if (gamesWithUser.length === 0) return <p>No games found.</p>;

  return (
    <div>
      {gamesWithUser.map((game) => (
        <RemoteGameCard key={game.gameId} game={game} userId={userId} />
      ))}
    </div>
  );
}
