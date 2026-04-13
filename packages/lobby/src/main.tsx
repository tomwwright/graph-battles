import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { LobbySettingsProvider } from './providers/LobbySettingsProvider';

createRoot(document.getElementById('root')!).render(
  <LobbySettingsProvider>
    <App />
  </LobbySettingsProvider>
);
