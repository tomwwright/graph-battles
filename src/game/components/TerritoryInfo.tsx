import * as React from "react";
import { Territory } from "models/territory";
import { Card, BackgroundImage, Box, Subhead, Small, Text } from "rebass";
import TerritoryAction from "game/components/TerritoryAction";

import { ASSET_PATH } from "game/phaser";

type TerritoryInfoProps = {
  territory: Territory;
};

const TerritoryInfo: React.StatelessComponent<TerritoryInfoProps> = ({ territory }) => (
  <div>
    <Card width={256}>
      <BackgroundImage src={`${ASSET_PATH}territory-portrait.jpg`} />
      <Box p={2}>
        <Subhead>
          Territory {territory.data.id}{" "}
          <Small>{territory.player ? `Player ${territory.data.playerId}` : "No player"}</Small>
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
    {territory.data.actions.map(action => <TerritoryAction action={action} />)}
  </div>
);

export default TerritoryInfo;
