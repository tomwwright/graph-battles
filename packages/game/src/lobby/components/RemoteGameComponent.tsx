import * as React from 'react';
import { Card, Flex, Box, Subhead, Small, Text, Button } from 'rebass';

import { PlayerList } from 'lobby/components/PlayerList';

import { GameSummary } from 'game/providers/api';

type RemoteGameProps = {
  game: GameSummary;
  playerId: string;
}

const toTimeDescription = (ms: number) => {
  const seconds = Math.floor(ms / (1000 * 60));
  if (seconds < 60)
    return 'moments';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return `${hours} hour${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7)
    return `${days} day${days > 1 ? 's' : ''}`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''}`;
}

const toLeaderboardText = (leaderboard: GameSummary["leaderboard"]) => {
  return leaderboard.map(leader => `${leader.name} (${leader.victoryPoints})`).join(', ')
}

const openGameUrl = (gameId: string, playerId: string) => {
  const url = `/assets/html/index.html?gameId=${gameId}&playerId=${playerId}`
  window.open(url, '_blank')
}

export const RemoteGameComponent: React.StatelessComponent<RemoteGameProps> = ({ game, playerId }) => {
  
  return (
    <Card my={1}>
      <Flex p={2}>
        <Box width={1 / 4} m={1}>
          <Subhead>
            {game.gameId}
          </Subhead>
          <Small>
            <Text>Updated {toTimeDescription(Date.now() - game.updatedAt)} ago</Text>
          </Small>
        </Box>
        <Box width={1 / 2} m={1}>
          <Text>{game.maxVictoryPoints} Victory Points ({game.turn}/{game.maxTurns} turns)</Text>
          <Text pt={2} ><Small>{game.numTerritories} territories</Small></Text>
          <Text pt={2} ><Small>{toLeaderboardText(game.leaderboard)}</Small></Text>
        </Box>
        <Box width={1 / 4} m={1} style={{ alignSelf: 'center' }}>
          <Flex style={{ justifyContent: 'space-around' }}>
            <Button onClick={() => openGameUrl(game.gameId, playerId)}>Open</Button>
          </Flex>
        </Box>
      </Flex>
    </Card>
  )
};