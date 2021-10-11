import * as React from 'react';
import { Text } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Player, Values } from '@battles/models';

type PlayerListItemProps = {
  player: Player;
}

const PlayerListItem: React.StatelessComponent<PlayerListItemProps> = ({ player }) => {
  const colour = Values.ColourStrings[player.data.colour];

  return (
    <InfoPane>
      <Text color={colour}>Player {player.data.id}</Text>
    </InfoPane>
  );
}

export default PlayerListItem;