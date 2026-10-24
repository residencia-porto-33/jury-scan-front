import { describe, expect, it } from 'vitest';

import {
  AnalyzeError,
  createDomainError,
  errorFromStatus,
  InvalidResponseError,
  parseRetryAfter,
  toDomainError,
} from './errors';

describe('errorFromStatus', () => {
  it.each([
    [400, 'invalid_input', false],
    [413, 'too_large', false],
    [422, 'invalid_response', true],
    [429, 'busy', true],
    [503, 'busy', true],
    [502, 'upstream', true],
    [504, 'timeout', true],
    [500, 'unknown', true],
    [418, 'unknown', true],
  ] as const)('%i → %s (retry: %s)', (status, kind, retryable) => {
    const error = errorFromStatus(status);
    expect(error.kind).toBe(kind);
    expect(error.retryable).toBe(retryable);
    expect(error.title.length).toBeGreaterThan(0);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('usa as mensagens da tabela da US09', () => {
    expect(errorFromStatus(400).message).toBe(
      'Texto inválido ou fora do tamanho permitido. Revise e tente de novo.',
    );
    expect(errorFromStatus(429).message).toBe('Serviço ocupado no momento. Tente novamente em instantes.');
    expect(errorFromStatus(504).message).toBe('A análise demorou mais que o esperado.');
  });

  it('respeita Retry-After em 429/503', () => {
    expect(errorFromStatus(429, '12').retryAfterSec).toBe(12);
    expect(errorFromStatus(503, '5').retryAfterSec).toBe(5);
    expect(errorFromStatus(502, '5').retryAfterSec).toBeUndefined();
  });
});

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');

  it('aceita segundos e data HTTP', () => {
    expect(parseRetryAfter('30', now)).toBe(30);
    expect(parseRetryAfter('Sat, 24 Oct 2026 12:00:20 GMT', now)).toBe(20);
  });

  it('limita a 5 minutos e ignora valores inválidos', () => {
    expect(parseRetryAfter('99999', now)).toBe(300);
    expect(parseRetryAfter('0', now)).toBeUndefined();
    expect(parseRetryAfter('amanhã', now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });
});

describe('toDomainError', () => {
  it('desembrulha AnalyzeError e traduz InvalidResponseError', () => {
    expect(toDomainError(new AnalyzeError(createDomainError('network'))).kind).toBe('network');
    expect(toDomainError(new InvalidResponseError('x')).kind).toBe('invalid_response');
    expect(toDomainError(new Error('boom')).kind).toBe('unknown');
  });
});
