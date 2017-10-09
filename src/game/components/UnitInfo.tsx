import * as React from "react";
import { Unit } from "models/unit";
import { Card, BackgroundImage, Box, Subhead, Small, Text } from "rebass";

import { ASSET_PATH } from "game/phaser";
import { StatusDefinitions } from "game/constants";

type UnitInfoProps = {
  unit: Unit;
};

const UnitInfo: React.StatelessComponent<UnitInfoProps> = ({ unit, children }) => (
  <Card width={256}>
    <BackgroundImage src={`${ASSET_PATH}unit-portrait.jpg`} />
    <Box p={2}>
      <Subhead>
        Unit {unit.data.id} <Small>{unit.player ? `Player ${unit.data.playerId}` : "No player"}</Small>
      </Subhead>
      <Small>
        <Text>Location {unit.location.data.id}</Text>
        <Text>Food Consumption {unit.data.foodConsumption}</Text>
        <Text>{unit.data.statuses.map(status => StatusDefinitions[status].text).join(", ")}</Text>
      </Small>
    </Box>
  </Card>
);

export default UnitInfo;
