import * as React from 'react';
import Styled from 'styled-components';
import { Fixed, Overlay, Heading, Text, Button } from 'rebass';

import Player from 'models/player';
import { ColourStrings } from 'models/values';

type NextPlayerProps = {
  turn: number;
  maxTurns: number;
  player: Player;
  onClick: () => void;
};

const Span = Styled.span`
  color: ${props => props.color}
`;

export const NextPlayerPopup: React.StatelessComponent<NextPlayerProps> = (props) => (
  <div>
    <Fixed top right bottom left />
    <Overlay>
      <Heading>
        Turn {props.turn}/{props.maxTurns}
      </Heading>
      <Text>
        <Span color={ColourStrings[props.player.data.colour]}>
          Player {props.player.data.id}
        </Span>{' '}
        you're up!
          </Text>
      <Button onClick={() => props.onClick()}>Go</Button>
    </Overlay>
  </div>
);