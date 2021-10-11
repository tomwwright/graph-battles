import * as React from 'react';
import { Button, Input, Close } from 'rebass';
import Styled from 'styled-components';

type NewPlayerProps = {
  name: string;
  colour: string;
  colours: string[];
  onDelete: () => void;
  onUpdateName: (name: string) => void;
}


const AbsoluteOverlay = Styled.div`
  position: absolute;
  z-index: 2;
`;

const CloseOverlay = Styled.div`
  position: fixed;
  background: black;
  opacity: 0.1;
  top: 0px;
  right: 0px;
  left: 0px;
  bottom: 0px;
`;

const PlayerRow = Styled.div`
  margin: 10px 0px;
`;

export class NewPlayer extends React.Component<NewPlayerProps, {}> {
  
  render() {
    return (
      <PlayerRow>
        <Button style={{ background: this.props.colour, height: '32px', width: '32px' }} />
        <Input style={{ width: '200px', height: '32px', margin: '0px 5px', padding: '10px' }} value={this.props.name} placeholder='Player Name' onChange={(e) => this.props.onUpdateName(e.target.value)} />
        {this.props.onDelete && <Close onClick={() => this.props.onDelete()} />}
      </PlayerRow>
    )
  }

}