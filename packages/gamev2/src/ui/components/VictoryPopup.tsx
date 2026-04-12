import { Values } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import styles from './Popup.module.css';

export function VictoryPopup() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const game = useGameStore((s) => s.game);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  if (turnPhase !== 'victory') return null;

  const winners = map.winningPlayers(
    game.data.maxVictoryPoints,
    game.turn > game.data.maxTurns,
  );

  const players = [...map.players].sort((a, b) => b.victoryPoints - a.victoryPoints);

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.popupHeading}>Turn {game.turn}</div>
        <div className={styles.popupText}>
          {winners.map((player) => {
            const colour = Values.ColourStrings[player.data.colour] ?? 'white';
            return (
              <span key={player.data.id} style={{ color: colour, fontWeight: 'bold' }}>
                Player {player.data.id}
              </span>
            );
          })}
          {winners.length > 1 ? ' have ' : ' has '}
          won the game with{' '}
          <strong>{winners[0]?.victoryPoints} Victory Points</strong>!
        </div>

        <div style={{ textAlign: 'left', marginBottom: 12, fontSize: 12 }}>
          {players.map((player) => {
            const colour = Values.ColourStrings[player.data.colour] ?? 'gray';
            return (
              <div key={player.data.id} style={{ color: colour, marginBottom: 2 }}>
                Player {player.data.id} — VP {player.victoryPoints}, Gold {player.data.gold}
              </div>
            );
          })}
        </div>

        <button
          className={styles.popupButton}
          onClick={() => dispatch.onSetTurn(game.data.maps.length - 1)}
        >
          Replay Final Turn
        </button>
      </div>
    </div>
  );
}
