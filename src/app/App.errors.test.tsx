import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import cnisText from '../mocks/fixtures/cnis-ficticio.txt?raw';
import { analiseCompleta } from '../mocks/fixtures/responses';
import { env } from '../shared/config/env';
import { mockAnalyzeSequence, pasteAndAnalyze, respondJson } from '../test/helpers';
import { App } from './App';

const SECRET = 'Traceback (most recent call last): sqlalchemy password=hunter2';

/** Cada linha da tabela de erros da US09. */
const TABLE: Array<{
  label: string;
  respond: () => Response | Promise<Response>;
  title: RegExp;
  message: string;
  retry: boolean;
}> = [
  {
    label: '400',
    respond: respondJson({ detail: SECRET }, 400),
    title: /Texto não aceito/,
    message: 'Texto inválido ou fora do tamanho permitido. Revise e tente de novo.',
    retry: false,
  },
  {
    label: '413',
    respond: respondJson({ detail: SECRET }, 413),
    title: /Documento grande demais/,
    message: 'Documento grande demais para análise.',
    retry: false,
  },
  {
    label: '422',
    respond: respondJson({ detail: SECRET }, 422),
    title: /Análise incompleta/,
    message: 'A análise retornou incompleta. Tente novamente.',
    retry: true,
  },
  {
    label: '200 fora do contrato (adapter)',
    respond: respondJson({ ...analiseCompleta, risco_agregado: 'catastrófico' }),
    title: /Análise incompleta/,
    message: 'A análise retornou incompleta. Tente novamente.',
    retry: true,
  },
  {
    label: '429',
    respond: respondJson({ detail: SECRET }, 429),
    title: /Serviço ocupado/,
    message: 'Serviço ocupado no momento. Tente novamente em instantes.',
    retry: true,
  },
  {
    label: '503',
    respond: respondJson({ detail: SECRET }, 503),
    title: /Serviço ocupado/,
    message: 'Serviço ocupado no momento. Tente novamente em instantes.',
    retry: true,
  },
  {
    label: '502',
    respond: respondJson({ detail: SECRET }, 502),
    title: /Análise indisponível/,
    message: 'Não foi possível concluir a análise agora.',
    retry: true,
  },
  {
    label: '504',
    respond: respondJson({ detail: SECRET }, 504),
    title: /Tempo esgotado/,
    message: 'A análise demorou mais que o esperado.',
    retry: true,
  },
  {
    label: 'rede/offline',
    respond: () => HttpResponse.error(),
    title: /Sem conexão/,
    message: 'Sem conexão com o servidor. Verifique sua internet.',
    retry: true,
  },
  {
    label: '500 (outros)',
    respond: respondJson({ detail: SECRET }, 500),
    title: /Algo deu errado/,
    message: 'Algo deu errado. Tente novamente.',
    retry: true,
  },
];

describe('Erros seguros (US09)', () => {
  it.each(TABLE)('$label → mensagem amigável, foco no alerta, sem detalhe do servidor', async (row) => {
    const user = userEvent.setup();
    mockAnalyzeSequence(row.respond);
    render(<App />);

    await pasteAndAnalyze(user, cnisText);

    const title = await screen.findByRole('heading', { name: row.title });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText(row.message)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Traceback');
    expect(document.body.textContent).not.toContain('hunter2');
    // O texto continua no campo para o usuário não precisar refazer nada.
    expect(screen.getByLabelText('Texto do extrato do CNIS')).toHaveValue(cnisText);

    if (row.retry) {
      expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('button', { name: /Tentar novamente/ })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Revisar o texto' }));
      await waitFor(() => expect(screen.getByLabelText('Texto do extrato do CNIS')).toHaveFocus());
      expect(screen.getByRole('button', { name: 'Analisar' })).not.toHaveAttribute('aria-disabled');
    }
  });

  it('respeita Retry-After antes de liberar "Tentar novamente"', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(
      respondJson({ detail: 'ocupado' }, 429, { 'Retry-After': '1' }),
      respondJson(analiseCompleta),
    );
    render(<App />);

    await pasteAndAnalyze(user, cnisText);
    const waiting = await screen.findByRole('button', { name: /Tentar novamente em 1 s/ });
    expect(waiting).toHaveAttribute('aria-disabled', 'true');
    await user.click(waiting);
    expect(bodies).toHaveLength(1);

    const ready = await screen.findByRole('button', { name: 'Tentar novamente' }, { timeout: 2500 });
    await user.click(ready);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    expect(bodies).toHaveLength(2);
  });

  describe('timeout local', () => {
    const original = env.requestTimeoutMs;
    afterEach(() => {
      (env as { requestTimeoutMs: number }).requestTimeoutMs = original;
    });

    it('aborta a chamada e mostra "Tempo esgotado"', async () => {
      (env as { requestTimeoutMs: number }).requestTimeoutMs = 50;
      const user = userEvent.setup();
      mockAnalyzeSequence(async () => {
        await delay('infinite');
        return HttpResponse.json(analiseCompleta);
      });
      render(<App />);

      await pasteAndAnalyze(user, cnisText);
      expect(await screen.findByRole('heading', { name: /Tempo esgotado/ })).toBeInTheDocument();
    });
  });

  it('não faz retry automático', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(respondJson({ detail: 'x' }, 422));
    render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: /Análise incompleta/ });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(bodies).toHaveLength(1);
  });
});
