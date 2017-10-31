import * as React from 'react';
import Unit from 'models/unit';
import { Card, Box, Small, Text, Button } from 'rebass';

import { ColourStrings } from 'models/values';
import Combat from 'models/combat';

type CombatInfoProps = {
  combat: Combat;
  onClick: (combat: Combat) => void;
};

const CombatInfo: React.StatelessComponent<CombatInfoProps> = ({ combat, onClick }) => (
  <Card width={256}>
    <Box p={2}>
      <Text>Combat {combat.location.data.id} </Text>
      {combat.combatants.map((combatant, i) => (
        <Small key={i}>
          <Text color={ColourStrings[combatant.player ? combatant.player.data.colour : 'black']}>
            {combatant.player ? `Player ${combatant.player.data.id}` : 'No Player'}{' '}
            <Small color="black">{combatant.combatRating} points</Small>
          </Text>
        </Small>
      ))}
      <Button onClick={() => onClick(combat)}>Resolve</Button>
    </Box>
  </Card>
);

export default CombatInfo;
