import { SavedGameCard } from './SavedGameCard';
import { useSavedGames } from '../hooks/useSavedGames';
import type { ClientVersion } from '../types';
import { getGameUrl } from '../util';
import { useLobbySettings } from '../providers/LobbySettingsProvider';

type SavedGameListProps = {
  clientVersion: ClientVersion;
};

export function SavedGameList({ clientVersion }: SavedGameListProps) {
  const { games, deleteGame } = useSavedGames();
  const { playerName } = useLobbySettings();

  const gamesWithUser = games.filter((game) =>
    game.gameData.users.some((user) => user.name === playerName)
  );

  if (gamesWithUser.length === 0) {
    return <p>No games found.</p>;
  }

  return (
    <div>
      {gamesWithUser.map((game) => (
        <SavedGameCard
          key={game.gameData.id}
          game={game}
          onOpen={() => window.open(getGameUrl(clientVersion, game.gameData.id), '_blank')}
          onDelete={() => deleteGame(game.gameData.id)}
        />
      ))}
    </div>
  );
}
