import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { analiseCompleta } from '../../../mocks/fixtures/responses';
import { ANALYZE_URL } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';
import type { DomainError } from '../types';
import { analyzeCnis } from './analyzeClient';
import { AnalyzeError } from './errors';

const request = { texto_input: 'CNIS fictício', origem: 'texto_colado' as const };

async function failure(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.then(
    () => {
      throw new Error('deveria ter falhado');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AnalyzeError);
  return (error as AnalyzeError).domain;
}

describe('analyzeCnis', () => {
  it('envia texto_input e origem como JSON e devolve o corpo cru', async () => {
    let received: unknown;
    server.use(
      http.post(ANALYZE_URL, async ({ request: req }) => {
        received = await req.json();
        expect(req.headers.get('content-type')).toBe('application/json');
        return HttpResponse.json(analiseCompleta);
      }),
    );
    await expect(analyzeCnis(request)).resolves.toEqual(analiseCompleta);
    expect(received).toEqual(request);
  });

  it.each([
    [400, 'invalid_input'],
    [413, 'too_large'],
    [422, 'invalid_response'],
    [429, 'busy'],
    [500, 'unknown'],
    [502, 'upstream'],
    [503, 'busy'],
    [504, 'timeout'],
  ] as const)('HTTP %i → %s, sem expor o corpo do erro', async (status, kind) => {
    server.use(http.post(ANALYZE_URL, () => HttpResponse.json({ detail: 'Traceback segredo' }, { status })));
    const error = await failure(analyzeCnis(request));
    expect(error.kind).toBe(kind);
    expect(JSON.stringify(error)).not.toContain('segredo');
  });

  it('lê Retry-After', async () => {
    server.use(
      http.post(ANALYZE_URL, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '7' } })),
    );
    expect((await failure(analyzeCnis(request))).retryAfterSec).toBe(7);
  });

  it('falha de rede → network', async () => {
    server.use(http.post(ANALYZE_URL, () => HttpResponse.error()));
    expect((await failure(analyzeCnis(request))).kind).toBe('network');
  });

  it('JSON inválido no 200 → invalid_response', async () => {
    server.use(http.post(ANALYZE_URL, () => new HttpResponse('<html>', { status: 200 })));
    expect((await failure(analyzeCnis(request))).kind).toBe('invalid_response');
  });

  it('timeout local → timeout', async () => {
    server.use(
      http.post(ANALYZE_URL, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    expect((await failure(analyzeCnis(request, { timeoutMs: 20 }))).kind).toBe('timeout');
  });

  it('cancelamento manual → cancelled', async () => {
    server.use(
      http.post(ANALYZE_URL, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const promise = analyzeCnis(request, { signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    expect((await failure(promise)).kind).toBe('cancelled');
  });
});
