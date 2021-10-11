import * as React from 'react';
import { Text, Small } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Unit, Values } from '@battles/models';

type UnitListItemProps = {
  unit: Unit;
}

const UnitListItem: React.StatelessComponent<UnitListItemProps> = ({ unit }) => {
  const colour = Values.ColourStrings[unit.player ? unit.player.data.colour : Values.Colour.BLACK];

  return (
    <InfoPane>
      <Text color={colour}>Unit {unit.data.id} <Small color={Values.ColourStrings[Values.Colour.BLACK]}>{unit.location.data.type == "territory" ? "Territory" : "Edge"} {unit.data.locationId}</Small></Text>
    </InfoPane>
  );
}

export default UnitListItem;