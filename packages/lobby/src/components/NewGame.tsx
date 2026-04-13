import { useState } from 'react';
import { GameData, GameMap, GameMapData, Utils, Values } from '@battles/models';
import { NewPlayer } from './NewPlayer';
import { useSavedGames } from '../hooks/useSavedGames';
import * as api from '../services/api';
import type { ViewData } from '../types';
import styles from './NewGame.module.css';

type NewGameProps = {
  gameType?: 'local' | 'remote';
};

type NewPlayerData = {
  name: string;
  colour: string;
};

const ColourPalette = [
  Values.Colour.RED,
  Values.Colour.BLUE,
  Values.Colour.GREEN,
  Values.Colour.ORANGE,
  Values.Colour.PURPLE,
  Values.Colour.YELLOW,
].map((colourNumber) => '#' + Utils.toHexColour(colourNumber));

function getUnusedColours(players: NewPlayerData[]): string[] {
  const playerColours = players.map((p) => p.colour);
  return ColourPalette.filter((colour) => !Utils.contains(playerColours, colour));
}

function randId(length: number): string {
  let id = '';
  for (let i = 0; i < length; ++i) {
    id += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  return id;
}

export function NewGame({ gameType }: NewGameProps) {
  const { save } = useSavedGames();
  const [players, setPlayers] = useState<NewPlayerData[]>([
    { name: '', colour: ColourPalette[0] },
    { name: '', colour: ColourPalette[1] },
  ]);
  const [turns, setTurns] = useState(10);
  const [victoryPoints, setVictoryPoints] = useState(25);
  const [isCreating, setIsCreating] = useState(false);

  function addPlayer() {
    setPlayers([...players, { name: '', colour: getUnusedColours(players)[0] }]);
  }

  function deletePlayer(i: number) {
    setPlayers(players.filter((_, idx) => idx !== i));
  }

  function updateName(i: number, name: string) {
    const updated = [...players];
    updated[i] = { ...updated[i], name };
    setPlayers(updated);
  }

  function validate(): string | null {
    if (!players.every((p) => p.name.length > 0)) return 'Enter names for all players';
    return null;
  }

  async function createGame() {
    setIsCreating(true);

    try {
      const [mapResponse, viewResponse] = await Promise.all([
        fetch(`/lobby/maps/lobby.map.${players.length}players.json`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`/lobby/maps/lobby.view.${players.length}players.json`, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);

      const mapData: GameMapData = await mapResponse.json();
      const map = new GameMap(mapData);
      const viewData: ViewData = await viewResponse.json();

      const mapPlayers = map.players.map((player) => player.data);
      for (let i = 0; i < mapPlayers.length; i++) {
        mapPlayers[i].colour = Number.parseInt(players[i].colour.substring(1), 16);
      }

      const isLocal = gameType === 'local';

      const gameData: GameData = {
        id: randId(6),
        users: players.map((player, i) => ({
          id: isLocal ? '#USER' + i : player.name,
          type: 'user' as const,
          name: player.name,
          playerIds: [map.playerIds[i]],
        })),
        maxTurns: turns,
        maxVictoryPoints: victoryPoints,
        maps: [mapData],
      };

      if (isLocal) {
        save({ gameData, viewData, lastUpdated: Date.now() });
      } else {
        await api.createGame(gameData, viewData);
        window.location.reload();
      }

      setPlayers([
        { name: '', colour: players[0].colour },
        { name: '', colour: players[1].colour },
      ]);
      setTurns(10);
      setVictoryPoints(25);
    } finally {
      setIsCreating(false);
    }
  }

  const validationError = validate();

  return (
    <div className={styles.container}>
      <div className={styles.players}>
        {players.map((player, i) => (
          <NewPlayer
            key={i}
            colour={player.colour}
            name={player.name}
            colours={getUnusedColours(players)}
            onDelete={i > 1 ? () => deletePlayer(i) : null}
            onUpdateName={(name) => updateName(i, name)}
          />
        ))}
        {players.length < 4 && <button onClick={addPlayer}>+</button>}
      </div>
      <div className={styles.settings}>
        <div className={styles.sliderGroup}>
          <label>
            Turn Limit: <i>{turns} turns</i>
          </label>
          <input
            type="range"
            value={turns}
            min={6}
            max={20}
            step={2}
            onChange={(e) => setTurns(Number(e.target.value))}
          />
        </div>
        <div className={styles.sliderGroup}>
          <label>
            Victory Points: <i>{victoryPoints} points</i>
          </label>
          <input
            type="range"
            value={victoryPoints}
            min={20}
            max={50}
            step={5}
            onChange={(e) => setVictoryPoints(Number(e.target.value))}
          />
        </div>
        <div className={styles.createRow}>
          <button disabled={validationError != null || isCreating} onClick={createGame}>
            Create Game
          </button>
          {validationError && <i className={styles.validationError}>{validationError}</i>}
        </div>
      </div>
    </div>
  );
}
