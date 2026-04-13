import { useState } from 'react';
import { GameData, GameMap, GameMapData, Utils, Values } from '@battles/models';
import { NewPlayer } from './NewPlayer';
import { PlayerIdentity } from './PlayerIdentity';
import { PlayerNameCta } from './PlayerNameCta';
import { useSavedGames } from '../hooks/useSavedGames';
import * as api from '../services/api';
import type { ClientVersion, GameMode, VersionedViewData } from '../types';
import styles from './NewGame.module.css';
import { useLobbySettings } from '../providers/LobbySettingsProvider';

type NewGameProps = {
  gameType: GameMode;
  clientVersion: ClientVersion;
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

function getUnusedColours(usedColours: string[]): string[] {
  return ColourPalette.filter((colour) => !Utils.contains(usedColours, colour));
}

function randId(length: number): string {
  let id = '';
  for (let i = 0; i < length; ++i) {
    id += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  return id;
}

export function NewGame({ gameType, clientVersion }: NewGameProps) {
  const { save } = useSavedGames();
  const { playerName, setPlayerName } = useLobbySettings();

  // Other players (index 1+). Player 0 is always the identity player.
  const [otherPlayers, setOtherPlayers] = useState<NewPlayerData[]>([
    { name: '', colour: ColourPalette[1] },
  ]);
  const [turns, setTurns] = useState(10);
  const [victoryPoints, setVictoryPoints] = useState(25);
  const [isCreating, setIsCreating] = useState(false);

  const allColours = [ColourPalette[0], ...otherPlayers.map((p) => p.colour)];
  const unusedColours = getUnusedColours(allColours);

  function addPlayer() {
    setOtherPlayers([...otherPlayers, { name: '', colour: unusedColours[0] }]);
  }

  function deletePlayer(i: number) {
    setOtherPlayers(otherPlayers.filter((_, idx) => idx !== i));
  }

  function updateOtherName(i: number, name: string) {
    const updated = [...otherPlayers];
    updated[i] = { ...updated[i], name };
    setOtherPlayers(updated);
  }

  function validate(): string | null {
    if (!playerName) return 'Set your player name to get started';
    if (!otherPlayers.every((p) => p.name.length > 0)) return 'Enter names for all players';
    return null;
  }

  async function createGame() {
    setIsCreating(true);

    try {
      const totalPlayers = 1 + otherPlayers.length;

      const viewFile =
        clientVersion === 'v2'
          ? `/lobby/maps/lobby.view.${totalPlayers}players.txt`
          : `/lobby/maps/lobby.view.${totalPlayers}players.json`;

      const [mapResponse, viewResponse] = await Promise.all([
        fetch(`/lobby/maps/lobby.map.${totalPlayers}players.json`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(viewFile, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);

      const mapData: GameMapData = await mapResponse.json();
      const map = new GameMap(mapData);

      const viewData: VersionedViewData =
        clientVersion === 'v2'
          ? { version: 'v2', data: await viewResponse.text() }
          : { version: 'v1', data: await viewResponse.json() };

      const allPlayers: NewPlayerData[] = [
        { name: playerName, colour: ColourPalette[0] },
        ...otherPlayers,
      ];

      const mapPlayers = map.players.map((player) => player.data);
      for (let i = 0; i < mapPlayers.length; i++) {
        mapPlayers[i].colour = Number.parseInt(allPlayers[i].colour.substring(1), 16);
      }

      const isLocal = gameType === 'local';

      const gameData: GameData = {
        id: randId(6),
        users: allPlayers.map((player, i) => ({
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

      setOtherPlayers([{ name: '', colour: otherPlayers[0].colour }]);
      setTurns(10);
      setVictoryPoints(25);
    } finally {
      setIsCreating(false);
    }
  }

  const validationError = validate();

  return (
    <div>
      {!playerName && <PlayerNameCta />}
      <div className={styles.container}>
        <div className={styles.players}>
          <PlayerIdentity
            name={playerName}
            colour={ColourPalette[0]}
            onNameChange={setPlayerName}
          />
          {otherPlayers.map((player, i) => (
            <NewPlayer
              key={i}
              colour={player.colour}
              name={player.name}
              colours={unusedColours}
              onDelete={otherPlayers.length > 1 ? () => deletePlayer(i) : null}
              onUpdateName={(name) => updateOtherName(i, name)}
            />
          ))}
          {1 + otherPlayers.length < 4 && <button onClick={addPlayer}>+ Add</button>}
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
    </div>
  );
}
