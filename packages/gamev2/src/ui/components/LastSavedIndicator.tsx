import { useEffect, useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import styles from './HeaderBar.module.css';

function relativeTime(fromMs: number, nowMs: number): string {
  const deltaSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  return `${deltaDay}d ago`;
}

export function LastSavedIndicator() {
  const lastSavedAt = useGameStore((s) => s.lastSavedAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const label = lastSavedAt === null ? 'Never' : relativeTime(lastSavedAt, Date.now());

  return (
    <span className={styles.lastSaved}>
      <span aria-hidden="true">✓</span> Last saved {label}
    </span>
  );
}
