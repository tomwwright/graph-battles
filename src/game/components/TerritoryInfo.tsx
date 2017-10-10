import * as React from "react";
import { Territory } from "models/territory";
import { Card, BackgroundImage, Box, Subhead, Small, Text } from "rebass";
import TerritoryAction from "game/components/TerritoryAction";
import { TerritoryAction as TerritoryActionEnum, ColourStrings } from "models/values";

import { ASSET_PATH } from "game/phaser";

type TerritoryInfoProps = {
  territory: Territory;
  setTerritoryAction: (action: TerritoryActionEnum) => void;
};

const TerritoryInfo: React.StatelessComponent<TerritoryInfoProps> = ({ territory, setTerritoryAction }) => (
  <div>
    <Card width={256}>
      <BackgroundImage src={`${ASSET_PATH}territory-portrait.jpg`} />
      <Box p={2}>
        <Subhead>
          Territory {territory.data.id}{" "}
          <Small color={territory.player ? ColourStrings[territory.player.data.colour] : "gray"}>
            {territory.player ? `Player ${territory.data.playerId}` : "No player"}
          </Small>
        </Subhead>
        <Small>
          <Text>
            Food {territory.data.food}/{territory.data.maxFood} (+{territory.data.foodProduction})
          </Text>
          <Text>Gold +{territory.data.goldProduction}</Text>
          <Text>{territory.units.length > 0 ? territory.units.length : "No"} units</Text>
        </Small>
      </Box>
    </Card>
    {territory.data.actions.map((action, i) => {
      const isSelected = territory.data.currentAction === action;
      const isAvailable = territory.data.currentAction === null || isSelected;
      return (
        <TerritoryAction
          key={i}
          onClick={setTerritoryAction}
          action={action}
          isSelected={isSelected}
          isAvailable={isAvailable}
        />
      );
    })}
  </div>
);

export default TerritoryInfo;
