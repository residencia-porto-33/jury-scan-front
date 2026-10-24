import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { logger } from '../shared/lib/logger';
import { App } from './App';

async function enableMocking(): Promise<void> {
  // Comparação estática: em build de produção sem mock, o bloco e o MSW somem do bundle.
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const { worker } = await import('../mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

// LGPD: por padrão o React imprime erros no console, e a mensagem pode carregar dados.
const root = createRoot(container, {
  onCaughtError: () => logger.warn('react_caught_error'),
  onUncaughtError: () => logger.warn('react_uncaught_error'),
  onRecoverableError: () => logger.warn('react_recoverable_error'),
});

void enableMocking().then(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
});
