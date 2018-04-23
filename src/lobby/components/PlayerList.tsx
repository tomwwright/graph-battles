import * as React from 'react';
import { Text } from 'rebass';
import Styled from 'styled-components';

import { UserData } from 'models/user';
import { PlayerData } from 'models/player';
import { toHexColour } from 'models/utils';

type PlayerListProps = {
  users: UserData[];
  players: PlayerData[];
}

const Span = Styled.span`
  color: ${props => props.color}
`;

export const PlayerList: React.StatelessComponent<PlayerListProps> = ({ users, players }) => {
  const playerUserMappings = users.map((user, i) => ({
    user: user,
    player: players[i]
  }));

  const playerSpans = playerUserMappings.map(mapping => <Span key={mapping.user.id} color={`#${toHexColour(mapping.player.colour)}`}>{mapping.user.name}</Span>);

  const elements = [];
  playerSpans.forEach((playerSpan, i) => {
    if (i > 0) {
      if (i == playerSpans.length - 1)
        elements.push(playerSpans.length > 2 ? ', and ' : ' and ');
      else
        elements.push(', ');
    }
    elements.push(playerSpan);
  });

  return <Text>{elements}</Text>;
}