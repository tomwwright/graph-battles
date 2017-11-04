import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Card, Text, Button } from 'rebass';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import CombatInfo from 'game/components/CombatInfo';
import TurnSelect from 'game/components/TurnSelect';

import Combat from 'models/combat';

type GameInfoProps = {
  gameStore?: GameStore;
  uiStore?: UiStore;
};

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ gameStore, uiStore }) => (
  <div>
    <TurnSelect currentTurn={uiStore.turn} numTurns={gameStore.game.data.maps.length} onClick={(turn: number) => uiStore.setTurn(turn)} />
    {gameStore.map.players.map((player, i) => (
      <PlayerInfo key={i} player={player} isActive={gameStore.currentPlayerId === player.data.id} />
    ))}
    {gameStore.combats.map((combat, i) => (
      <CombatInfo
        key={i}
        combat={combat}
        onClick={(combat: Combat) => gameStore.resolveCombat(combat.location.data.id)}
      />
    ))}
    <Button onClick={() => gameStore.resolveMoves()}>Resolve Moves</Button>
  </div>
);

export default inject('gameStore', 'uiStore')(observer(GameInfo));
