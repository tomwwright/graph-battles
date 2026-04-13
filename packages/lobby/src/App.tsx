import { NewGame } from './components/NewGame';
import { SavedGameList } from './components/SavedGameList';
import { RemoteGameList } from './components/RemoteGameList';
import { ToggleSwitch } from './components/ToggleSwitch';
import { SettingsPanel } from './components/SettingsPanel';
import { useGameMode } from './hooks/useGameMode';
import { usePlayerName } from './hooks/usePlayerName';
import { useClientVersion } from './hooks/useClientVersion';
import styles from './App.module.css';

export function App() {
  const [gameMode, setGameMode] = useGameMode();
  const [playerName] = usePlayerName();
  const [clientVersion, setClientVersion] = useClientVersion();

  return (
    <div className={styles.wrapper}>
      <img className={styles.banner} src="/lobby/territory-portrait.jpg" alt="Territory" />
      <div className={styles.content}>
        <h2>New Game</h2>
        <NewGame gameType={gameMode} clientVersion={clientVersion} />
        <hr className={styles.divider} />
        <div className={styles.gameModeRow}>
          <ToggleSwitch
            leftLabel="Local"
            rightLabel="Remote"
            checked={gameMode === 'remote'}
            onChange={(checked) => setGameMode(checked ? 'remote' : 'local')}
          />
        </div>
        {playerName && (
          <p className={styles.playingAs}>Playing as: {playerName}</p>
        )}
        {gameMode === 'local' ? (
          <div>
            <h2>Local Saved Games</h2>
            <SavedGameList clientVersion={clientVersion} />
          </div>
        ) : (
          <div>
            <h2>Remote Games</h2>
            {!playerName ? (
              <p className={styles.noNameHint}>Set your player name in the form above to view your games.</p>
            ) : (
              <RemoteGameList clientVersion={clientVersion} />
            )}
          </div>
        )}
        <SettingsPanel clientVersion={clientVersion} onClientVersionChange={setClientVersion} />
      </div>
    </div>
  );
}
