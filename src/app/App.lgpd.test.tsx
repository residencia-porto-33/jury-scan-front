import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import cnisText from '../mocks/fixtures/cnis-ficticio.txt?raw';
import { analiseCompleta } from '../mocks/fixtures/responses';
import { mockAnalyzeSequence, pasteAndAnalyze, respondJson } from '../test/helpers';
import { App } from './App';

/** Trechos sensíveis do CNIS fictício que não podem aparecer fora da memória da aba. */
const SENSITIVE = [
  '123.456.789-00',
  '123.45678.90-0',
  'MARIA FICTICIA',
  'COMERCIO FICTICIO BETA SA',
  'PREM-EXT',
];

function serialize(calls: unknown[][]): string {
  return calls
    .flat()
    .map((arg) => {
      try {
        return typeof arg === 'string' ? arg : JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join('\n');
}

describe('LGPD — nenhum dado do CNIS sai da memória da aba', () => {
  it('fluxo completo não usa storage, cookies, URL, history nem console', async () => {
    const spies = {
      localStorage: vi.spyOn(Storage.prototype, 'setItem'),
      console: (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
        vi.spyOn(console, method),
      ),
      pushState: vi.spyOn(history, 'pushState'),
      replaceState: vi.spyOn(history, 'replaceState'),
    };
    const urlBefore = window.location.href;

    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson({ detail: 'x' }, 502), respondJson(analiseCompleta));
    render(<App />);

    // Envio com erro, retry, relatório, filtros, conferência, ocultar dados e nova análise.
    await pasteAndAnalyze(user, cnisText);
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    await user.click(screen.getByRole('button', { name: /^Alta 2$/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Conferido (CNIS-001)' }));
    await user.click(screen.getByRole('button', { name: 'Ocultar dados pessoais' }));
    await user.click(screen.getByRole('button', { name: 'Ver no documento (evidência CNIS-001)' }));
    await user.click(screen.getByRole('button', { name: 'Nova análise' }));

    // Storage (local e session compartilham Storage.prototype).
    expect(spies.localStorage).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    // Cookies, URL e history.
    expect(document.cookie).toBe('');
    expect(spies.pushState).not.toHaveBeenCalled();
    expect(spies.replaceState).not.toHaveBeenCalled();
    expect(window.location.href).toBe(urlBefore);
    // Console: nenhum trecho do documento.
    const consoleOutput = serialize(spies.console.flatMap((spy) => spy.mock.calls));
    for (const fragment of SENSITIVE) expect(consoleOutput).not.toContain(fragment);
  });

  it('o corpo da requisição contém somente texto_input e origem', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    expect(bodies).toEqual([{ texto_input: cnisText, origem: 'texto_colado' }]);
  });
});
