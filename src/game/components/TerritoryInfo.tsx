import * as React from 'react';
import Territory from 'models/territory';
import Player from 'models/player';
import { Card, BackgroundImage, Box, Subhead, Small, Text } from 'rebass';
import TerritoryAction from 'game/components/TerritoryAction';
import { TerritoryAction as TerritoryActionEnum, ColourStrings } from 'models/values';

import { ASSET_PATH } from 'game/constants';

type TerritoryInfoProps = {
  territory: Territory;
  currentPlayer: Player;
  setTerritoryAction: (action: TerritoryActionEnum) => void;
};

const TerritoryInfo: React.StatelessComponent<TerritoryInfoProps> = ({ territory, currentPlayer, setTerritoryAction }) => {
  const isControlledByCurrentPlayer = currentPlayer && territory.data.playerId === currentPlayer.data.id;
  return (
    <div>
      <Card width={256}>
        <BackgroundImage src={`${ASSET_PATH}territory-portrait.jpg`} />
        <Box p={2}>
          <Subhead>
            Territory {territory.data.id}{' '}
            <Small color={territory.player ? ColourStrings[territory.player.data.colour] : 'gray'}>
              {territory.player ? `Player ${territory.data.playerId}` : 'No player'}
            </Small>
          </Subhead>
          <Small>
            <Text>
              Food {territory.data.food}/{territory.maxFood} (+{territory.foodProduction})
          </Text>
            <Text>Gold +{territory.goldProduction}</Text>
            <Text>{territory.units.length > 0 ? territory.units.length : 'No'} units</Text>
          </Small>
        </Box>
      </Card>
      {isControlledByCurrentPlayer ? territory.actions.map((action, i) => (
        <TerritoryAction
          key={i}
          onClick={setTerritoryAction}
          action={action}
          territory={territory}
        />)) : null
      }
    </div>
  )
};

export default TerritoryInfo;
