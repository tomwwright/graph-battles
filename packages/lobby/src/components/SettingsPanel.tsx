import { useState } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import type { ClientVersion } from '../types';
import styles from './SettingsPanel.module.css';

type SettingsPanelProps = {
  clientVersion: ClientVersion;
  onClientVersionChange: (version: ClientVersion) => void;
};

export function SettingsPanel({ clientVersion, onClientVersionChange }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        &#9881; Settings {open ? '\u25BE' : '\u25B8'}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Game Client:</span>
            <ToggleSwitch
              leftLabel="v1"
              rightLabel="v2"
              checked={clientVersion === 'v2'}
              onChange={(checked) => onClientVersionChange(checked ? 'v2' : 'v1')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
