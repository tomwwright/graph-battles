import * as React from 'react';
import { Text } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Territory, Values } from '@battles/models';

type TerritoryListItemProps = {
  territory: Territory;
}

const TerritoryListItem: React.StatelessComponent<TerritoryListItemProps> = ({ territory }) => {
  const colour = Values.ColourStrings[territory.player ? territory.player.data.colour : Values.Colour.BLACK];

  return (
    <InfoPane>
      <Text color={colour}>Territory {territory.data.id}</Text>
    </InfoPane>
  );
}

export default TerritoryListItem;