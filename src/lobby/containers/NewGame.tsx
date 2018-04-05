import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Subhead, Text, Button, Row, Column, Slider } from 'rebass';
import { GithubPicker } from 'react-color';

import { SavedGameStore } from 'lobby/stores/savedgame';
import { NewPlayer } from 'lobby/components/NewPlayer';

import { Colour } from 'models/values';
import { contains, clone } from 'models/utils';

type NewGameProps = {
  savedGameStore?: SavedGameStore;
}

type NewGameState = {
  players: NewPlayerData[];
  turns: number;
  victoryPoints: number;
}

type NewPlayerData = {
  name: string;
  colour: string;
};

const ColourPalette = [Colour.RED, Colour.BLUE, Colour.GREEN, Colour.ORANGE, Colour.PURPLE, Colour.YELLOW].map(colourNumber => '#' + ('000000' + colourNumber.toString(16)).substr(-6));

@inject('savedGameStore')
@observer
export class NewGame extends React.Component<NewGameProps, NewGameState> {
  state: NewGameState = {
    players: [
      {
        name: 'Test Player',
        colour: ColourPalette[0]
      },
      {
        name: '',
        colour: ColourPalette[1]
      }
    ],
    turns: 10,
    victoryPoints: 25
  };

  addPlayer() {
    const players = clone(this.state.players);
    players.push({
      name: '',
      colour: this.getUnusedColours()[0]
    });
    this.setState({
      players
    });
  }

  createGame() {

  }

  validate() {
    const namesValid = this.state.players.map(player => player.name).every(name => name.length > 0);
    if (!namesValid)
      return "Enter names for all players";
    return null;
  }

  onDelete(i: number) {
    const players = clone(this.state.players);
    players.splice(i, 1);
    this.setState({
      players
    });
  }

  onUpdateColour(i: number, colour: string) {
    const { players } = this.state;
    players[i].colour = colour;
    this.setState({ players });
  }

  onUpdateName(i: number, name: string) {
    const { players } = this.state;
    players[i].name = name;
    this.setState({ players });
  }

  onUpdateTurns(turns: number) {
    this.setState({ turns });
  }

  onUpdateVictoryPoints(victoryPoints: number) {
    this.setState({ victoryPoints });
  }

  getUnusedColours() {
    const playerColours = this.state.players.map(player => player.colour);
    let unusedColours = ColourPalette.filter(colour => !contains(playerColours, colour));
    return unusedColours;
  }

  render() {
    const validationError = this.validate();
    return (
      <div>
        <Subhead>New Game</Subhead>
        <Row>
          <Column>
            {this.state.players.map((player, i) => (
              <NewPlayer
                key={i}
                colour={player.colour}
                name={player.name}
                colours={this.getUnusedColours()}
                onDelete={i > 1 ? (() => this.onDelete(i)) : null}
                onUpdateColour={(colour) => this.onUpdateColour(i, colour)}
                onUpdateName={(name) => this.onUpdateName(i, name)} />
            ))}
            {this.state.players.length < 4 && <Button onClick={() => this.addPlayer()}>+</Button>}
          </Column>
          <Column>
            <Text>Turn Limit: {this.state.turns} turns</Text>
            <Slider value={this.state.turns} min={6} max={20} step={2} onChange={(e) => this.onUpdateTurns(e.target.value)} />
            <Text>Victory Points: {this.state.victoryPoints} points</Text>
            <Slider value={this.state.victoryPoints} min={20} max={50} step={5} onChange={(e) => this.onUpdateVictoryPoints(e.target.value)} />
            {validationError && <p>{validationError}</p>}
            <Button disabled={validationError != null} onClick={() => this.createGame()}>Create Game</Button>
          </Column>
        </Row>
      </div >
    )
  }
}