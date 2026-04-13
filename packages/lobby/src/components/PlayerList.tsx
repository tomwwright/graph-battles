import { PlayerData, UserData, Utils } from '@battles/models';

type PlayerListProps = {
  users: UserData[];
  players: PlayerData[];
};

export function PlayerList({ users, players }: PlayerListProps) {
  const mappings = users.map((user, i) => ({
    user,
    player: players[i],
  }));

  const elements: React.ReactNode[] = [];
  mappings.forEach((mapping, i) => {
    if (i > 0) {
      if (i === mappings.length - 1) elements.push(mappings.length > 2 ? ', and ' : ' and ');
      else elements.push(', ');
    }
    elements.push(
      <span key={mapping.user.id} style={{ color: `#${Utils.toHexColour(mapping.player.colour)}` }}>
        {mapping.user.name}
      </span>
    );
  });

  return <p>{elements}</p>;
}
