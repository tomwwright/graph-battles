import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const params = new URLSearchParams(window.location.search);

createRoot(document.getElementById('root')!).render(
  <App
    userId={params.get('userId') ?? undefined}
    gameType={(params.get('gameType') as 'local' | 'remote') ?? undefined}
  />
);
