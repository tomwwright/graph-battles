import type { ReactNode } from 'react';
import styles from './DismissableModal.module.css';

type DismissableModalProps = {
  isOpen: boolean;
  onDismiss: () => void;
  title: ReactNode;
  children: ReactNode;
};

export function DismissableModal({
  isOpen,
  onDismiss,
  title,
  children,
}: DismissableModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
