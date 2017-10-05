import * as React from "react";
import { Unit } from "models/unit";
import { Card, BackgroundImage, Box, Subhead, Small } from "rebass";

type UnitInfoProps = {
  unit: Unit;
};

const UnitInfo: React.StatelessComponent<UnitInfoProps> = ({ unit, children }) => (
  <Card width={256}>
    <BackgroundImage src="http://placekitten.com/g/500/300" />
    <Box p={2}>
      <Subhead>Unit {unit.data.id}</Subhead>
      <Small>
        Location {unit.location.data.id}, Food Consumption {unit.data.foodConsumption}
      </Small>
    </Box>
  </Card>
);

export default UnitInfo;
