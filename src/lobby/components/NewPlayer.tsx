import * as React from 'react';
import { Button, Input } from 'rebass';
import { GithubPicker } from 'react-color';
import Styled from 'styled-components';

import { include } from 'models/utils';

type NewPlayerProps = {
  name: string;
  colour: string;
  colours: string[];
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onUpdateColour: (colour: string) => void;
}

type NewPlayerState = {
  isColourPickerOpen: boolean;
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

export class NewPlayer extends React.Component<NewPlayerProps, NewPlayerState> {
  state = {
    isColourPickerOpen: false
  };

  onOpenPicker() {
    this.setState({
      isColourPickerOpen: true
    });
  }

  onClosePicker(colour: string) {
    this.setState({
      isColourPickerOpen: false,
    });
    if (colour) {
      this.props.onUpdateColour(colour);
    }
  }

  render() {
    return (
      <div>
        <Button style={{ background: this.props.colour, height: '32px', width: '32px' }} onClick={() => this.onOpenPicker()} />
        <Input style={{ width: '200px' }} value={this.props.name} placeholder='Player Name' onChange={(e) => this.props.onUpdateName(e.target.value)} />
        {this.state.isColourPickerOpen && (
          <AbsoluteOverlay>
            <CloseOverlay onClick={() => this.onClosePicker(null)} />
            <GithubPicker onChange={(colour) => this.onClosePicker(colour.hex)} colors={include(this.props.colours, this.props.colour)} />
          </AbsoluteOverlay>
        )}
        {this.props.onDelete && <Button onClick={() => this.props.onDelete()}>X</Button>}
      </div>
    )
  }

}