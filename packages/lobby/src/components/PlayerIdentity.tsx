import { useState, useRef, useEffect } from 'react';
import styles from './PlayerIdentity.module.css';
import playerStyles from './NewPlayer.module.css';

type PlayerIdentityProps = {
  name: string;
  colour: string;
  onNameChange: (name: string) => void;
};

export function PlayerIdentity({ name, colour, onNameChange }: PlayerIdentityProps) {
  const isNew = name === '';
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function save() {
    const trimmed = draft.trim();
    if (trimmed) {
      onNameChange(trimmed);
    }
    setEditing(false);
  }

  function startEditing() {
    setDraft(name);
    setEditing(true);
  }

  if (editing) {
    return (
      <div className={playerStyles.row}>
        <button className={playerStyles.colourSwatch} style={{ background: colour }} />
        <input
          ref={inputRef}
          className={playerStyles.nameInput}
          value={draft}
          placeholder="Your Name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </div>
    );
  }

  return (
    <div className={playerStyles.row}>
      <button className={playerStyles.colourSwatch} style={{ background: colour }} />
      {isNew ?
        <span className={styles.placeholderName}>[enter name]</span>
        :
        <span className={styles.displayName}>{name}</span>
      }
      <button className={styles.editButton} onClick={startEditing} title="Edit name">
        &#9998;
      </button>
    </div>
  );
}
