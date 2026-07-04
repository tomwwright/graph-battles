import { useGameSession } from '../GameSessionProvider';
import { FpsCounter } from './FpsCounter';
import { LastSavedIndicator } from './LastSavedIndicator';
import { GameMenu } from './GameMenu';
import styles from './HeaderBar.module.css';

export function HeaderBar() {
  const session = useGameSession();
  const hasSession = Boolean(session.gameId);

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <FpsCounter />
      </div>
      <div className={styles.right}>
        {hasSession && <LastSavedIndicator />}
        {hasSession && (
          <span className={styles.identity}>
            {session.gameId} / {session.userId}
          </span>
        )}
        <GameMenu />
      </div>
    </div>
  );
}
