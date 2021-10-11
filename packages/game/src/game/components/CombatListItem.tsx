import * as React from 'react';
import { Text, Small } from 'rebass';

import InfoPane from 'game/components/InfoPane';

import { Combat } from '@battles/models';

type CombatListItemProps = {
  combat: Combat;
}

const CombatListItem: React.StatelessComponent<CombatListItemProps> = ({ combat }) => {
  return (
    <InfoPane>
      <Text>Combat <Small>{combat.location.data.type == "territory" ? "Territory" : "Edge"} {combat.location.data.id} </Small></Text>
    </InfoPane >
  );
}

export default CombatListItem;