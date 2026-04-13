import { SavedGameCard } from './SavedGameCard';
import { useSavedGames } from '../hooks/useSavedGames';

export function SavedGameList() {
  const { games, deleteGame } = useSavedGames();

  return (
    <div>
      {games.map((game) => (
        <SavedGameCard
          key={game.gameData.id}
          game={game}
          linkUrl="/assets/html/index.html?gameId="
          onDelete={() => deleteGame(game.gameData.id)}
        />
      ))}
    </div>
  );
}
