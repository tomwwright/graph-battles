import type { ClientVersion } from './types';

export function getGameUrl(clientVersion: ClientVersion, gameId: string, userId?: string): string {
  if (clientVersion === 'v2') {
    const params = new URLSearchParams({ gameId });
    if (userId) params.set('userId', userId);
    return `/v2/?${params}`;
  }
  const params = new URLSearchParams({ gameId });
  if (userId) params.set('userId', userId);
  return `/assets/html/index.html?${params}`;
}

export function toTimeDescription(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'moments';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''}`;
}
