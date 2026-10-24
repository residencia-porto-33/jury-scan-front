import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

async function enableMocking(): Promise<void> {
  // Comparação estática: em build de produção sem mock, o bloco e o MSW somem do bundle.
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('../mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
