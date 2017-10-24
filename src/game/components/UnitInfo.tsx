import * as React from 'react';
import Unit from 'models/unit';
import { Card, BackgroundImage, Box, Subhead, Small, Button, Text } from 'rebass';

import { StatusDefinitions, ASSET_PATH } from 'game/constants';
import { ColourStrings } from 'models/values';

type UnitInfoProps = {
  unit: Unit;
  onCancelMoveClick: () => void;
};

const UnitInfo: React.StatelessComponent<UnitInfoProps> = ({ unit, onCancelMoveClick, children }) => (
  <Card width={256}>
    <BackgroundImage src={`${ASSET_PATH}unit-portrait.jpg`} />
    <Box p={2}>
      <Subhead>
        Unit {unit.data.id}{' '}
        <Small color={unit.player ? ColourStrings[unit.player.data.colour] : 'gray'}>
          {unit.player ? `Player ${unit.data.playerId}` : 'No player'}
        </Small>
      </Subhead>
      <Small>
        <Text>Location {unit.location.data.id}</Text>
        <Text>Food Consumption {unit.data.foodConsumption}</Text>
        <Text>{unit.data.statuses.map(status => StatusDefinitions[status].text).join(', ')}</Text>
      </Small>
      {unit.data.destinationId ? <Button onClick={onCancelMoveClick}>Cancel Move</Button> : ''}
    </Box>
  </Card>
);

export default UnitInfo;
