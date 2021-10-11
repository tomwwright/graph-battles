import * as React from 'react';
import { Small, Text } from 'rebass';
import InfoPane from 'game/components/InfoPane';
import { Player, Values } from '@battles/models';

type PlayerInfoProps = {
  player: Player;
  isActive: boolean;
};

const PlayerInfo: React.StatelessComponent<PlayerInfoProps> = ({ player, isActive }) => {
  return (
    <InfoPane>
      <Text color={Values.ColourStrings[player.data.colour]}>
        Player {player.data.id} <Small color="black">{isActive ? '(Active)' : ''}</Small>
      </Text>
      <Small>
        <Text>
          Gold {player.data.gold} (+{player.data.goldProduction +
            player.territories.map(territory => territory.goldProduction).reduce((a, b) => a + b, 0)})
        </Text>
        <Text>Victory Points {player.victoryPoints}</Text>
        <Text>{player.data.ready ? 'Ready' : 'Not Ready'}</Text>
      </Small>
    </InfoPane>
  );
};

export default PlayerInfo;
