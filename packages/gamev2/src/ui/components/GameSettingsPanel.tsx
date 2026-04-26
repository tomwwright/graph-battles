import { useGameStore } from '../../state/useGameStore';
import panelStyles from './panels.module.css';

export function GameSettingsPanel() {
  const game = useGameStore((s) => s.game);

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.heading}>Game</div>
      <div className={panelStyles.row}>
        <span className={panelStyles.small}>Max Turns</span>
        <span>{game.data.maxTurns}</span>
      </div>
      <div className={panelStyles.row}>
        <span className={panelStyles.small}>VP to Win</span>
        <span>{game.data.maxVictoryPoints}</span>
      </div>
    </div>
  );
}
