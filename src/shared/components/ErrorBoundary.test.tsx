import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('CPF 123.456.789-00 vazou na mensagem');
}

describe('ErrorBoundary', () => {
  it('mostra tela genérica com "Recarregar" e não exibe a mensagem do erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Algo deu errado/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('123.456.789-00');
  });
});
