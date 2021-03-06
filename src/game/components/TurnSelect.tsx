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
    turnButtons.push(<Button key={i} onClick={() => props.onClick(i)} disabled={i === props.currentTurn} bg={i === props.numTurns ? 'green' : 'blue'} >{i}</Button>);
  }
  return <InfoPane>
    <Text>Turns <Small>{props.currentTurn < props.numTurns ? '(Replaying)' : ''}</Small></Text>
    {turnButtons}
  </InfoPane>
};

export default TurnSelect;
