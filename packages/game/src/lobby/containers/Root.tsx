import * as React from 'react';
import { Card, Box, Button, Subhead, Divider, Image, Input, Text } from 'rebass';
import Styled from 'styled-components';

import { NewGame } from 'lobby/containers/NewGame';
import { SavedGameList } from 'lobby/containers/SavedGameList';
import { RemoteGameList } from 'lobby/containers/RemoteGameList';

const Wrapper = Styled(Card)`
  margin: auto;
`;

type EnterPlayerIdState = {
  playerId: string;
};

class EnterPlayerIdComponent extends React.Component<{}, EnterPlayerIdState> {
  onSubmit(userId: string) {
    const url = `?gameType=remote&userId=${userId}`;
    window.open(url, '_self');
  }

  render() {
    return (
      <div>
        <Text>Enter player name: </Text>
        <Input
          style={{ width: '200px', height: '32px', margin: '0px 5px', padding: '10px' }}
          placeholder="Player Name"
          onChange={(e) => this.setState({ playerId: e.target.value })}
        />
        <Button onClick={() => this.onSubmit(this.state.playerId)}>Save</Button>
      </div>
    );
  }
}

const RemoteGamesComponent = ({ userId }) => (
  <div>
    <Subhead>Remote Games</Subhead>
    {userId === undefined ? (
      <EnterPlayerIdComponent />
    ) : (
      <div>
        <Text>Playing as: {userId}</Text>
        <RemoteGameList userId={userId} />
      </div>
    )}
  </div>
);

const LocalGamesComponent = () => (
  <div>
    <Subhead>Local Saved Games</Subhead>
    <SavedGameList />
  </div>
);

export type RootProps = {
  userId?: string;
  gameType?: 'local' | 'remote';
};

export const Root: React.StatelessComponent<RootProps> = ({ userId, gameType }) => (
  <Wrapper width={800} my={1}>
    <Image width="100%" src={`/assets/territory-portrait.jpg`} />
    <Box p={4}>
      <Subhead>New Game</Subhead>
      <NewGame gameType={gameType} />
      <Divider color="#CCC" my={4} mx={3} />
      {gameType === 'local' ? <LocalGamesComponent /> : <RemoteGamesComponent userId={userId} />}
    </Box>
  </Wrapper>
);
