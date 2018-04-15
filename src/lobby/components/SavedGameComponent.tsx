import * as React from 'react';
import { Card, Box, Row, Column, Subhead, Small, Text, Button } from 'rebass';

import { SavedGame } from 'game/providers/local';

type SavedGameProps = {
  game: SavedGame
  linkUrl: string;
  onDelete: () => void;
}

export const SavedGameComponent: React.StatelessComponent<SavedGameProps> = ({ game, linkUrl, onDelete }) => (
  <Card width={800} my={1}>
    <Box p={1}>
      <Row>
        <Column>
          <Subhead>
            {game.gameData.id}
          </Subhead>
          <Small>
            <Text>{game.gameData.maps[0].playerIds.length} players</Text>
          </Small>
        </Column>
        <Column>
          <Text>Turn {game.gameData.maps.length}/{game.gameData.maxTurns}</Text>
          <Text>Victory Points {game.gameData.maxVictoryPoints}</Text>
          <Text>Updated {Math.floor((Date.now() - game.lastUpdated) / (1000 * 60))} minutes ago</Text>
        </Column>
        <Column>
          <Button onClick={() => window.open(linkUrl + game.gameData.id, '_blank')}>Open</Button>
          <Button onClick={() => onDelete()}>Delete</Button>
        </Column>
      </Row>
    </Box>
  </Card>
)