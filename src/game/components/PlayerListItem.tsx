import * as React from 'react';
import { Text, Small } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Colour, ColourStrings } from 'models/values';
import { ID } from 'models/utils';
import Player from 'models/player';

type PlayerListItemProps = {
  player: Player;
}

const PlayerListItem: React.StatelessComponent<PlayerListItemProps> = ({ player }) => {
  const colour = ColourStrings[player.data.colour];

  return (
    <InfoPane>
      <Text color={colour}>Player {player.data.id}</Text>
    </InfoPane>
  );
}

export default PlayerListItem;