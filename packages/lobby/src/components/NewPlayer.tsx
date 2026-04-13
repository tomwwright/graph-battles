import styles from './NewPlayer.module.css';

type NewPlayerProps = {
  name: string;
  colour: string;
  colours: string[];
  onDelete: (() => void) | null;
  onUpdateName: (name: string) => void;
};

export function NewPlayer({ name, colour, onDelete, onUpdateName }: NewPlayerProps) {
  return (
    <div className={styles.row}>
      <button className={styles.colourSwatch} style={{ background: colour }} />
      <input
        className={styles.nameInput}
        value={name}
        placeholder="Player Name"
        onChange={(e) => onUpdateName(e.target.value)}
      />
      {onDelete && (
        <button className={styles.deleteButton} onClick={onDelete}>
          &times;
        </button>
      )}
    </div>
  );
}
