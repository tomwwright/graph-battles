import { useId, useState, type ReactNode } from 'react';
import styles from './ExpandablePanel.module.css';

type ExpandablePanelProps = {
  header: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

export function ExpandablePanel({
  header,
  children,
  defaultExpanded = false,
  className,
}: ExpandablePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = useId();

  return (
    <div className={className ? `${styles.panel} ${className}` : styles.panel}>
      <button
        type="button"
        className={styles.headerButton}
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={styles.caret} aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        <span className={styles.headerContent}>{header}</span>
      </button>
      {expanded && (
        <div id={bodyId} role="region" className={styles.body}>
          {children}
        </div>
      )}
    </div>
  );
}
