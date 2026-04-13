import { useState } from 'react';
import { NewGame } from './components/NewGame';
import { SavedGameList } from './components/SavedGameList';
import { RemoteGameList } from './components/RemoteGameList';
import styles from './App.module.css';

type AppProps = {
  userId?: string;
  gameType?: 'local' | 'remote';
};

function EnterPlayerId() {
  const [playerId, setPlayerId] = useState('');

  function onSubmit() {
    const url = `?gameType=remote&userId=${playerId}`;
    window.open(url, '_self');
  }

  return (
    <div>
      <p>Enter player name:</p>
      <input
        className={styles.playerIdInput}
        placeholder="Player Name"
        onChange={(e) => setPlayerId(e.target.value)}
      />
      <button onClick={onSubmit}>Save</button>
    </div>
  );
}

export function App({ userId, gameType }: AppProps) {
  return (
    <div className={styles.wrapper}>
      <img className={styles.banner} src="/lobby/territory-portrait.jpg" alt="Territory" />
      <div className={styles.content}>
        <h2>New Game</h2>
        <NewGame gameType={gameType} />
        <hr className={styles.divider} />
        {gameType === 'local' ? (
          <div>
            <h2>Local Saved Games</h2>
            <SavedGameList />
          </div>
        ) : (
          <div>
            <h2>Remote Games</h2>
            {userId === undefined ? (
              <EnterPlayerId />
            ) : (
              <div>
                <p>Playing as: {userId}</p>
                <RemoteGameList userId={userId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
