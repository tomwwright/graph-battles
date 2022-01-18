import * as React from 'react';
import { Card, Flex, Box, Subhead, Small, Text, Button } from 'rebass';

import { PlayerList } from 'lobby/components/PlayerList';

import { SavedGame } from 'game/providers/local';
import { GameMap, PlayerData } from '@battles/models';

type SavedGameProps = {
  game: SavedGame;
  linkUrl: string;
  onDelete: () => void;
};

const toTimeDescription = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'moments';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''}`;
};

export const SavedGameComponent: React.StatelessComponent<SavedGameProps> = ({ game, linkUrl, onDelete }) => {
  const latestMap = new GameMap(game.gameData.maps[game.gameData.maps.length - 1]);
  const leaders = latestMap.winningPlayers(0, false);

  return (
    <Card my={1}>
      <Flex p={2}>
        <Box width={1 / 4} m={1}>
          <Subhead>{game.gameData.id}</Subhead>
          <Small>
            <Text>{latestMap.territoryIds.length} territories</Text>
            <PlayerList
              users={game.gameData.users}
              players={game.gameData.users.map(
                (user) => game.gameData.maps[0].dataMap[user.playerIds[0]] as PlayerData
              )}
            />
          </Small>
        </Box>
        <Box width={1 / 2} m={1}>
          <Text>
            Turn {game.gameData.maps.length}/{game.gameData.maxTurns}
          </Text>
          <Text>
            Victory Points {leaders[0].victoryPoints}/{game.gameData.maxVictoryPoints}
          </Text>

          <Text pt={2}>
            <Small>Updated {toTimeDescription(Date.now() - game.lastUpdated)} ago</Small>
          </Text>
        </Box>
        <Box width={1 / 4} m={1} style={{ alignSelf: 'center' }}>
          <Flex style={{ justifyContent: 'space-around' }}>
            <Button onClick={() => window.open(linkUrl + game.gameData.id, '_blank')}>Open</Button>
            <Button onClick={() => onDelete()}>Delete</Button>
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
};
