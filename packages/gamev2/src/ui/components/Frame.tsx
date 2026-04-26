import type { PropsWithChildren } from 'react';
import styles from './Frame.module.css';

export const Frame = ({ children }: PropsWithChildren) => (
  <div className={styles.frame}>{children}</div>
);

export const Header = ({ children }: PropsWithChildren) => (
  <div className={styles.header}>{children}</div>
);

export const LeftColumn = ({ children }: PropsWithChildren) => (
  <div className={styles.leftCol}>{children}</div>
);

export const RightColumn = ({ children }: PropsWithChildren) => (
  <div className={styles.rightCol}>{children}</div>
);

export const SelectedSlot = ({ children }: PropsWithChildren) => (
  <div className={styles.selectedSlot}>{children}</div>
);

export const Footer = ({ children }: PropsWithChildren) => (
  <div className={styles.footer}>{children}</div>
);
