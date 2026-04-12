import type { PropsWithChildren } from 'react';
import styles from './Frame.module.css';

export const Frame = ({ children }: PropsWithChildren) => (
  <div className={styles.frame}>{children}</div>
);

export const Header = ({ children }: PropsWithChildren) => (
  <div className={styles.header}>{children}</div>
);

export const SidebarContainer = ({ children }: PropsWithChildren) => (
  <div className={styles.sidebarContainer}>{children}</div>
);

export const Sidebar = ({ children }: PropsWithChildren) => (
  <div className={styles.sidebar}>{children}</div>
);

export const Footer = ({ children }: PropsWithChildren) => (
  <div className={styles.footer}>{children}</div>
);
