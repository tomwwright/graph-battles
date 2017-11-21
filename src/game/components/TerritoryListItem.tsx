import * as React from 'react';
import { Text, Small } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Colour, ColourStrings } from 'models/values';
import { ID } from 'models/utils';
import Territory from 'models/territory';

type TerritoryListItemProps = {
  territory: Territory;
}

const TerritoryListItem: React.StatelessComponent<TerritoryListItemProps> = ({ territory }) => {
  const colour = ColourStrings[territory.player ? territory.player.data.colour : Colour.BLACK];

  return (
    <InfoPane>
      <Text color={colour}>Territory {territory.data.id}</Text>
    </InfoPane>
  );
}

export default TerritoryListItem;