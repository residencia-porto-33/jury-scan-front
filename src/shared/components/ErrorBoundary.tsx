import { RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logger } from '../lib/logger';
import { Alert } from './Alert';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Último recurso: qualquer erro de renderização vira uma tela genérica.
 * Não exibe nem registra mensagem ou stack (podem conter dados do documento).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    logger.warn('render_error');
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <Alert
          tone="error"
          title="Algo deu errado"
          headingLevel={1}
          actions={
            <Button icon={<RotateCw className="size-4" />} onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          }
        >
          <p>
            A página encontrou um erro inesperado. Ao recarregar, o texto e o resultado da análise são
            descartados — nada fica salvo no navegador.
          </p>
        </Alert>
      </main>
    );
  }
}
