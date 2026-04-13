import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ClientVersion, GameMode } from '../types';

type LobbySettings = {
  playerName: string;
  gameMode: GameMode;
  clientVersion: ClientVersion;
};

type LobbySettingsContextValue = LobbySettings & {
  setPlayerName: (name: string) => void;
  setGameMode: (mode: GameMode) => void;
  setClientVersion: (version: ClientVersion) => void;
};

const STORAGE_KEY = 'graph-battles-lobby-settings';

const defaults: LobbySettings = {
  playerName: '',
  gameMode: 'local',
  clientVersion: 'v1',
};

function load(): LobbySettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function persist(settings: LobbySettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const LobbySettingsContext = createContext<LobbySettingsContextValue | null>(null);

export function LobbySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LobbySettings>(load);

  const update = useCallback((patch: Partial<LobbySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const value: LobbySettingsContextValue = {
    ...settings,
    setPlayerName: useCallback((playerName: string) => update({ playerName }), [update]),
    setGameMode: useCallback((gameMode: GameMode) => update({ gameMode }), [update]),
    setClientVersion: useCallback((clientVersion: ClientVersion) => update({ clientVersion }), [update]),
  };

  return (
    <LobbySettingsContext.Provider value={value}>
      {children}
    </LobbySettingsContext.Provider>
  );
}

export function useLobbySettings(): LobbySettingsContextValue {
  const ctx = useContext(LobbySettingsContext);
  if (!ctx) throw new Error('useLobbySettings must be used within LobbySettingsProvider');
  return ctx;
}

