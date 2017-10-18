import * as React from 'react';
import Unit from 'models/unit';
import { Card, Box, Small, Text } from 'rebass';

import { ASSET_PATH } from 'game/phaser';
import { ColourStrings } from 'models/values';
import Player from 'models/player';
import UnitContainer from 'models/unitcontainer';

type CombatInfoProps = {
  location: UnitContainer;
};

type Combatant = {
  player: Player;
  units: Unit[];
};

const CombatInfo: React.StatelessComponent<CombatInfoProps> = ({ location }) => {
  const units = location.units;
  const combatants: Combatant[] = [];
  for (const unit of units) {
    const combatant = combatants.find(
      combatant =>
        (combatant.player === null && unit.player === null) ||
        (combatant.player && unit.player && combatant.player.data.id === unit.player.data.id)
    );
    if (combatant) {
      combatant.units.push(unit);
    } else {
      combatants.push({
        player: unit.player,
        units: [unit],
      });
    }
  }
  combatants.sort((a, b) => a.units.length - b.units.length);

  return (
    <Card width={256}>
      <Box p={2}>
        <Text>Combat {location.data.id} </Text>
        {combatants.map((combatant, i) => (
          <Small key={i}>
            <Text color={ColourStrings[combatant.player ? combatant.player.data.colour : 'black']}>
              {combatant.player ? `Player ${combatant.player.data.id}` : 'No Player'}{' '}
              <Small color="black">{combatant.units.length} units</Small>
            </Text>
          </Small>
        ))}
      </Box>
    </Card>
  );
};

export default CombatInfo;
