import { SavedGameCard } from './SavedGameCard';
import { useSavedGames } from '../hooks/useSavedGames';
import type { ClientVersion } from '../types';
import { getGameUrl } from '../util';

type SavedGameListProps = {
  clientVersion: ClientVersion;
};

export function SavedGameList({ clientVersion }: SavedGameListProps) {
  const { games, deleteGame } = useSavedGames();

  return (
    <div>
      {games.map((game) => (
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
