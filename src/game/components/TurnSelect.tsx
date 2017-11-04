import * as React from 'react';
import { Text, Small, Button } from 'rebass';
import InfoPane from 'game/components/InfoPane';

type TurnSelectProps = {
  numTurns: number;
  currentTurn: number;
  onClick: (turn: number) => void;
};

const TurnSelect: React.StatelessComponent<TurnSelectProps> = (props) => {
  const turnButtons = [];
  for (let i = 1; i <= props.numTurns; ++i) {
    turnButtons.push(<Button key={i} onClick={() => props.onClick(i)} disabled={i === props.currentTurn} >{i}</Button>);
  }
  return <InfoPane>
    <Small><Text>Turns</Text></Small>
    {turnButtons}
  </InfoPane>
};

export default TurnSelect;
