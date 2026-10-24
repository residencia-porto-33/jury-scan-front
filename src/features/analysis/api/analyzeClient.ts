import { env } from '../../../shared/config/env';
import type { AnalyzeRequest } from '../types';
import { AnalyzeError, createDomainError, errorFromStatus } from './errors';

const TIMEOUT = Symbol('timeout');
const CANCELLED = Symbol('cancelled');

export interface AnalyzeOptions {
  /** Cancelamento manual (botão "Cancelar"). */
  signal?: AbortSignal;
  timeoutMs?: number;
  baseUrl?: string;
}

/**
 * POST /api/analyze. Retorna o JSON cru (`unknown`) — quem valida é `normalizeAnalysis`.
 * Falhas sempre saem como `AnalyzeError` com um `DomainError`. Sem retry automático:
 * o backend já repete internamente no 422 e cada chamada custa uma inferência.
 */
export async function analyzeCnis(request: AnalyzeRequest, options: AnalyzeOptions = {}): Promise<unknown> {
  const { signal, timeoutMs = env.requestTimeoutMs, baseUrl = env.apiBaseUrl } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(TIMEOUT), timeoutMs);
  const onCancel = () => controller.abort(CANCELLED);

  if (signal?.aborted) onCancel();
  else signal?.addEventListener('abort', onCancel, { once: true });

  try {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });

    if (!response.ok) {
      throw new AnalyzeError(errorFromStatus(response.status, response.headers.get('Retry-After')));
    }

    try {
      return (await response.json()) as unknown;
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new AnalyzeError(createDomainError('invalid_response'));
    }
  } catch (error) {
    if (error instanceof AnalyzeError) throw error;
    if (controller.signal.aborted) {
      throw new AnalyzeError(
        createDomainError(controller.signal.reason === TIMEOUT ? 'timeout' : 'cancelled'),
      );
    }
    // fetch só rejeita com TypeError em falha de rede/CORS/offline.
    if (error instanceof TypeError) throw new AnalyzeError(createDomainError('network'));
    throw new AnalyzeError(createDomainError('unknown'));
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onCancel);
  }
}
