import * as React from 'react';
import { Text, Small } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Colour, ColourStrings } from 'models/values';
import { ID } from 'models/utils';
import Unit from 'models/unit';

type UnitListItemProps = {
  unit: Unit;
}

const UnitListItem: React.StatelessComponent<UnitListItemProps> = ({ unit }) => {
  const colour = ColourStrings[unit.player ? unit.player.data.colour : Colour.BLACK];

  return (
    <InfoPane>
      <Text color={colour}>Unit {unit.data.id} <Small color={ColourStrings[Colour.BLACK]}>{unit.location.data.type == "territory" ? "Territory" : "Edge"} {unit.data.locationId}</Small></Text>
    </InfoPane>
  );
}

export default UnitListItem;