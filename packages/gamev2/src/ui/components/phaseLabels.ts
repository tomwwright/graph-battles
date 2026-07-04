import type { Resolution } from '@battles/models';

export type ReplayPhase = Resolution['phase'];

export const PHASE_LABELS: Record<ReplayPhase, string> = {
  move: 'Movement',
  combat: 'Combat',
  'add-defend': 'Defenders',
  food: 'Food',
  gold: 'Gold',
  'territory-control': 'Territory Captures',
  'territory-action': 'Territory Actions',
};

/** Fixed display order for the replay phase list. Matches resolver order. */
export const REPLAY_PHASE_ORDER: ReplayPhase[] = [
  'move',
  'combat',
  'add-defend',
  'food',
  'gold',
  'territory-control',
  'territory-action',
];
