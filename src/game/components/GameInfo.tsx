import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Card, Text } from 'rebass';

import GameStore from 'game/stores/game';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import CombatInfo from 'game/components/CombatInfo';

type GameInfoProps = {
  gameStore?: GameStore;
};

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ gameStore }) => (
  <div>
    <InfoPane>
      <Text>Units: {gameStore.map.units.length}</Text>
      <Text>Territories: {gameStore.map.territories.length}</Text>
    </InfoPane>
    {gameStore.map.players.map((player, i) => (
      <PlayerInfo key={i} player={player} isActive={gameStore.currentPlayerId === player.data.id} />
    ))}
    {gameStore.combats.map((combat, i) => <CombatInfo key={i} location={combat} />)}
  </div>
);

export default inject('gameStore')(observer(GameInfo));
