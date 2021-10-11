import * as React from 'react';
import { Card, Box, Small, Text, Button } from 'rebass';

import { Combat, Values } from '@battles/models';

type CombatInfoProps = {
  combat: Combat;
};

const CombatInfo: React.StatelessComponent<CombatInfoProps> = ({ combat }) => (
  <Card width={256}>
    <Box p={2}>
      <Text>Combat {combat.location.data.id} </Text>
      {combat.combatants.map((combatant, i) => (
        <Small key={i}>
          <Text color={Values.ColourStrings[combatant.player ? combatant.player.data.colour : 'black']}>
            {combatant.player ? `Player ${combatant.player.data.id}` : 'No Player'}{' '}
            <Small color="black">{combatant.combatRating} points</Small>
          </Text>
        </Small>
      ))}
    </Box>
  </Card>
);

export default CombatInfo;
