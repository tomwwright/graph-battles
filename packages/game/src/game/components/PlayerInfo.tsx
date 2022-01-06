import * as React from 'react';
import { Small, Text } from 'rebass';
import InfoPane from 'game/components/InfoPane';
import { Player, User, Values } from '@battles/models';
import { userInfo } from 'os';

type PlayerInfoProps = {
  user: User;
  player: Player;
  isActive: boolean;
};

const PlayerInfo: React.StatelessComponent<PlayerInfoProps> = ({ player, user, isActive }) => {
  return (
    <InfoPane>
      <Text color={Values.ColourStrings[player.data.colour]}>
        {user.data.name} ({player.data.id}) <Small color="black">{isActive ? '(Active)' : ''}</Small>
      </Text>
      <Small>
        <Text>
          Gold {player.data.gold} (+
          {player.data.goldProduction +
            player.territories.map((territory) => territory.goldProduction).reduce((a, b) => a + b, 0)}
          )
        </Text>
        <Text>Victory Points {player.victoryPoints}</Text>
      </Small>
    </InfoPane>
  );
};

export default PlayerInfo;
