import * as React from 'react';
import { Card, Box, Subhead, Small, Text } from 'rebass';

import { SavedGame } from 'game/providers/local';

type SavedGameProps = {
  game: SavedGame
}

export const SavedGameComponent: React.StatelessComponent<SavedGameProps> = ({ game }) => (
  <Card width={256} my={1}>
    <Box p={1}>
      <Subhead>
        {game.gameData.id}
      </Subhead>
      <Small>
        <Text>{game.gameData.maps[0].playerIds.length} players</Text>
      </Small>
    </Box>
  </Card>
)