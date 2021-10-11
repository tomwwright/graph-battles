import * as React from 'react';
import { Card, BackgroundImage, Box, Subhead, Small, Text } from 'rebass';
import TerritoryAction from 'game/components/TerritoryAction';
import SelectedTerritoryAction from 'game/components/SelectedTerritoryAction';
import { Player, Territory, Values } from '@battles/models';

import { ASSET_PATH } from 'game/constants';

type TerritoryInfoProps = {
  territory: Territory;
  currentPlayer: Player;
  isPlanning: boolean;
  setTerritoryAction?: (action: Values.TerritoryAction) => void;
};

const TerritoryInfo: React.StatelessComponent<TerritoryInfoProps> = ({ territory, currentPlayer, isPlanning, setTerritoryAction }) => {
  const isControlledByCurrentPlayer = currentPlayer && territory.data.playerId === currentPlayer.data.id;

  return (
    <div>
      <Card width={256}>
        <BackgroundImage src={`${ASSET_PATH}territory-portrait.jpg`} />
        <Box p={2}>
          <Subhead>
            Territory {territory.data.id}{' '}
            <Small color={territory.player ? Values.ColourStrings[territory.player.data.colour] : 'gray'}>
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
      {isControlledByCurrentPlayer && isPlanning ? territory.actions.map((action, i) => (
        territory.data.currentAction === action ?
          <SelectedTerritoryAction key={i} action={action} onClickUnbuy={setTerritoryAction} />
          :
          <TerritoryAction
            key={i}
            onClickBuy={setTerritoryAction}
            action={action}
            territory={territory}
          />
      ))
        :
        territory.data.currentAction != null && <SelectedTerritoryAction action={territory.data.currentAction} onClickUnbuy={null} />
      }
    </div>
  )
};

export default TerritoryInfo;
