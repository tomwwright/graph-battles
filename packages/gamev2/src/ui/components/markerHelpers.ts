// Unicode glyphs — one per player slot, colour set via CSS `color`
const PLAYER_SHAPES = ['●', '■', '▲', '◆'];

export function playerShape(playerIndex: number): string {
  return PLAYER_SHAPES[playerIndex % PLAYER_SHAPES.length];
}

/** Convert a Values.Colour (hex number) to a CSS colour string. */
export function colourToCss(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
