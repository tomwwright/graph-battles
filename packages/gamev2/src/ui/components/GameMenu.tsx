import { useEffect, useRef, useState } from 'react';
import panelStyles from './panels.module.css';
import styles from './GameMenu.module.css';

export function GameMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (!rootRef.current) return;
      if (!(ev.target instanceof Node)) return;
      if (rootRef.current.contains(ev.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onBackToLobby = () => {
    window.location.href = '/';
  };

  const onConcede = () => {
    if (window.confirm('Concede this game?')) {
      console.log('[gamev2] Concede requested — not yet implemented');
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {open && (
        <div className={styles.buttonRow}>
          <button type="button" className={panelStyles.button} onClick={onBackToLobby}>
            Back to Lobby
          </button>
          <button type="button" className={panelStyles.buttonDanger} onClick={onConcede}>
            Concede
          </button>
        </div>
      )}
      <button
        type="button"
        className={open ? panelStyles.buttonActive : panelStyles.button}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
    </div>
  );
}
