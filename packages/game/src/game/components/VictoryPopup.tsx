import * as React from 'react';
import Styled from 'styled-components';
import { Fixed, Overlay, Heading, Text, Button } from 'rebass';

import { Player, Values } from '@battles/models';

type VictoryPopupProps = {
  turn: number;
  winners: Player[];
  onClick: () => void;
};

const Span = Styled.span`
  color: ${props => props.color}
`;

const Bold = Styled.span`
  font-weight: bold;
`;

export const VictoryPopup: React.StatelessComponent<VictoryPopupProps> = (props) => (
  <div>
    <Fixed top right bottom left />
    <Overlay>
      <Heading>
        Turn {props.turn}
      </Heading>
      <Text>
        {props.winners.map(player => (
          <Span color={Values.ColourStrings[player.data.colour]}>
            Player {player.data.id}
          </Span>
        )).join(' and ')}
        {props.winners.length > 1 ? ' have ' : ' has '}
        won the game with <Bold>{props.winners[0].victoryPoints} Victory Points</Bold>!
      </Text>
      <Button onClick={() => props.onClick()}>Replay Final Turn</Button>
    </Overlay>
  </div>
);
