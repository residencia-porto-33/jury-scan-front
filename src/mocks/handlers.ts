import { delay, http, HttpResponse, type HttpHandler } from 'msw';

import { looksLikeCnis } from '../features/input/cnisHeuristics';
import { env } from '../shared/config/env';
import { analiseCompleta, analiseNaoCnis, analiseSemAchados } from './fixtures/responses';

export const ANALYZE_URL = `${env.apiBaseUrl}/api/analyze`;

/**
 * Cenários forçados no modo mock: inclua `#mock:<cenario>` no texto colado.
 * Ex.: `#mock:504` simula timeout do servidor; `#mock:lento` permite testar "Cancelar".
 */
const SCENARIO = /#mock:([a-z0-9_]+)/i;

function errorResponse(status: number, headers?: Record<string, string>) {
  // Corpo propositalmente com detalhe interno: o front não pode exibi-lo.
  return HttpResponse.json(
    { detail: `stacktrace interno ${status}` },
    { status, ...(headers ? { headers } : {}) },
  );
}

export const handlers: HttpHandler[] = [
  http.post(ANALYZE_URL, async ({ request }) => {
    const body = (await request.json()) as { texto_input?: unknown };
    const text = typeof body.texto_input === 'string' ? body.texto_input : '';
    if (text.trim().length === 0) return errorResponse(400);

    const scenario = SCENARIO.exec(text)?.[1]?.toLowerCase();
    // Atraso perceptível no navegador para exibir o estado "Processando"; zero nos testes.
    await delay(import.meta.env.MODE === 'test' ? 0 : 1200);

    switch (scenario) {
      case '400':
      case '413':
      case '422':
      case '500':
      case '502':
      case '504':
        return errorResponse(Number(scenario));
      case '429':
      case '503':
        return errorResponse(Number(scenario), { 'Retry-After': '10' });
      case 'rede':
        return HttpResponse.error();
      case 'invalido':
        return HttpResponse.json({ issues: 'não é uma lista' });
      case 'lento':
        await delay('infinite');
        return HttpResponse.json(analiseCompleta);
      case 'sem_achados':
        return HttpResponse.json(analiseSemAchados);
      case 'nao_cnis':
        return HttpResponse.json(analiseNaoCnis(text));
    }

    return HttpResponse.json(looksLikeCnis(text) ? analiseCompleta : analiseNaoCnis(text));
  }),
];
