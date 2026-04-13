import styles from './ToggleSwitch.module.css';

type ToggleSwitchProps = {
  leftLabel: string;
  rightLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ToggleSwitch({ leftLabel, rightLabel, checked, onChange }: ToggleSwitchProps) {
  return (
    <label className={styles.container}>
      <span className={checked ? styles.label : styles.labelActive}>{leftLabel}</span>
      <span className={styles.track} role="switch" aria-checked={checked}>
        <input
          type="checkbox"
          className={styles.input}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.thumb} />
      </span>
      <span className={checked ? styles.labelActive : styles.label}>{rightLabel}</span>
    </label>
  );
}
