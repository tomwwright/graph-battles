import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Text, Button, Flex, Box, Slider, Divider, Container } from 'rebass';
import Axios, { AxiosRequestConfig } from 'axios';
import Styled from 'styled-components';

import { SavedGameStore } from 'lobby/stores/savedgame';
import { NewPlayer } from 'lobby/components/NewPlayer';

import { ViewData } from 'game/stores/phaser';

import { GameData, GameMapData, PlayerData, UserData, Utils, Values } from '@battles/models';
import { GameAPI } from 'game/providers/api';

type NewGameProps = {
  savedGameStore?: SavedGameStore;
  gameType: 'local' | 'remote';
};

type NewGameState = {
  players: NewPlayerData[];
  turns: number;
  victoryPoints: number;
  isCreatingGame: boolean;
};

type NewPlayerData = {
  name: string;
  colour: string;
};

const ColourPalette = [
  Values.Colour.RED,
  Values.Colour.BLUE,
  Values.Colour.GREEN,
  Values.Colour.ORANGE,
  Values.Colour.PURPLE,
  Values.Colour.YELLOW,
].map((colourNumber) => '#' + Utils.toHexColour(colourNumber));

const SliderWrapper = Styled.div`
  margin-bottom: 15px;
`;

@inject('savedGameStore')
export class NewGame extends React.Component<NewGameProps, NewGameState> {
  state: NewGameState = {
    players: [
      {
        name: '',
        colour: ColourPalette[0],
      },
      {
        name: '',
        colour: ColourPalette[1],
      },
    ],
    turns: 10,
    victoryPoints: 25,
    isCreatingGame: false,
  };

  addPlayer() {
    const players = Utils.clone(this.state.players);
    players.push({
      name: '',
      colour: this.getUnusedColours()[0],
    });
    this.setState({
      players,
    });
  }

  async createGame() {
    this.setState({
      isCreatingGame: true,
    });

    const requestConfig: AxiosRequestConfig = {
      headers: {
        'Cache-Control': 'no-cache',
      },
    };

    const responses = await Promise.all([
      Axios.get('/assets/maps/lobby.map.' + this.state.players.length + 'players.json', requestConfig),
      Axios.get('/assets/maps/lobby.view.' + this.state.players.length + 'players.json', requestConfig),
    ]);

    const mapData: GameMapData = responses[0].data;
    const viewData: ViewData = responses[1].data;

    const players = mapData.playerIds.map((playerId) => mapData.dataMap[playerId] as PlayerData);
    for (let i = 0; i < players.length; i++) {
      players[i].colour = Number.parseInt(this.state.players[i].colour.substring(1), 16);
    }

    const randId = function (length: number) {
      let id = '';
      for (let i = 0; i < length; ++i) {
        id += String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
      return id;
    };

    const gameData: GameData = {
      id: randId(6),
      users: this.state.players.map((player, i) => ({
        id: '#USER' + i,
        type: 'user' as 'user',
        name: player.name,
        playerIds: [mapData.playerIds[i]],
      })),
      maxTurns: this.state.turns,
      maxVictoryPoints: this.state.victoryPoints,
      maps: [mapData],
    };

    if (this.props.gameType == 'local') {
      this.props.savedGameStore.save({
        gameData,
        viewData,
        lastUpdated: Date.now(),
      });
    } else {
      const gameApi = new GameAPI();
      await gameApi.createGame(gameData, viewData);
      window.location.reload();
    }

    this.setState({
      players: [
        {
          name: '',
          colour: this.state.players[0].colour,
        },
        {
          name: '',
          colour: this.state.players[1].colour,
        },
      ],
      turns: 10,
      victoryPoints: 25,
      isCreatingGame: false,
    });
  }

  validate() {
    const namesValid = this.state.players.map((player) => player.name).every((name) => name.length > 0);
    if (!namesValid) return 'Enter names for all players';
    return null;
  }

  onDelete(i: number) {
    const players = Utils.clone(this.state.players);
    players.splice(i, 1);
    this.setState({
      players,
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
    const playerColours = this.state.players.map((player) => player.colour);
    let unusedColours = ColourPalette.filter((colour) => !Utils.contains(playerColours, colour));
    return unusedColours;
  }

  render() {
    const validationError = this.validate();
    return (
      <Flex>
        <Box width={1 / 2}>
          {this.state.players.map((player, i) => (
            <NewPlayer
              key={i}
              colour={player.colour}
              name={player.name}
              colours={this.getUnusedColours()}
              onDelete={i > 1 ? () => this.onDelete(i) : null}
              onUpdateName={(name) => this.onUpdateName(i, name)}
            />
          ))}
          {this.state.players.length < 4 && <Button onClick={() => this.addPlayer()}>+</Button>}
        </Box>
        <Box width={1 / 2}>
          <SliderWrapper>
            <Text>
              Turn Limit: <i>{this.state.turns} turns</i>
            </Text>
            <Slider
              value={this.state.turns}
              min={6}
              max={20}
              step={2}
              onChange={(e) => this.onUpdateTurns(e.target.value)}
            />
          </SliderWrapper>
          <SliderWrapper>
            <Text>
              Victory Points: <i>{this.state.victoryPoints} points</i>
            </Text>
            <Slider
              value={this.state.victoryPoints}
              min={20}
              max={50}
              step={5}
              onChange={(e) => this.onUpdateVictoryPoints(e.target.value)}
            />
          </SliderWrapper>
          <Container mt={4} px={0} py={0}>
            <Button disabled={validationError != null || this.state.isCreatingGame} onClick={() => this.createGame()}>
              Create Game
            </Button>
            {validationError && <i style={{ marginLeft: '10px' }}>{validationError}</i>}
          </Container>
        </Box>
      </Flex>
    );
  }
}
