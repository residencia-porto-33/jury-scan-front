import type { DomainError, DomainErrorKind } from '../types';

/** A resposta 200 não respeitou o contrato. Nunca carrega conteúdo do documento. */
export class InvalidResponseError extends Error {
  constructor(reason: string) {
    super(`Resposta fora do contrato: ${reason}`);
    this.name = 'InvalidResponseError';
  }
}

/** Erro já traduzido para o domínio, lançado pelo client HTTP. */
export class AnalyzeError extends Error {
  readonly domain: DomainError;

  constructor(domain: DomainError) {
    super(domain.kind);
    this.name = 'AnalyzeError';
    this.domain = domain;
  }
}

const CATALOG: Record<DomainErrorKind, Omit<DomainError, 'kind' | 'retryAfterSec'>> = {
  invalid_input: {
    title: 'Texto não aceito',
    message: 'Texto inválido ou fora do tamanho permitido. Revise e tente de novo.',
    retryable: false,
  },
  too_large: {
    title: 'Documento grande demais',
    message: 'Documento grande demais para análise.',
    retryable: false,
  },
  invalid_response: {
    title: 'Análise incompleta',
    message: 'A análise retornou incompleta. Tente novamente.',
    retryable: true,
  },
  busy: {
    title: 'Serviço ocupado',
    message: 'Serviço ocupado no momento. Tente novamente em instantes.',
    retryable: true,
  },
  upstream: {
    title: 'Análise indisponível',
    message: 'Não foi possível concluir a análise agora.',
    retryable: true,
  },
  timeout: {
    title: 'Tempo esgotado',
    message: 'A análise demorou mais que o esperado.',
    retryable: true,
  },
  network: {
    title: 'Sem conexão',
    message: 'Sem conexão com o servidor. Verifique sua internet.',
    retryable: true,
  },
  cancelled: {
    title: 'Análise cancelada',
    message: 'Análise cancelada.',
    retryable: true,
  },
  unknown: {
    title: 'Algo deu errado',
    message: 'Algo deu errado. Tente novamente.',
    retryable: true,
  },
};

export function createDomainError(kind: DomainErrorKind, retryAfterSec?: number): DomainError {
  return retryAfterSec === undefined ? { kind, ...CATALOG[kind] } : { kind, ...CATALOG[kind], retryAfterSec };
}

/**
 * Converte status HTTP em erro de domínio. O corpo da resposta de erro nunca é
 * lido nem exibido (pode conter detalhes internos).
 */
export function errorFromStatus(status: number, retryAfterHeader?: string | null): DomainError {
  switch (status) {
    case 400:
      return createDomainError('invalid_input');
    case 413:
      return createDomainError('too_large');
    case 422:
      return createDomainError('invalid_response');
    case 429:
    case 503:
      return createDomainError('busy', parseRetryAfter(retryAfterHeader));
    case 502:
      return createDomainError('upstream');
    case 504:
      return createDomainError('timeout');
    default:
      return createDomainError('unknown');
  }
}

const MAX_RETRY_AFTER_SEC = 300;

/** Aceita segundos ("30") ou data HTTP. Valores absurdos são limitados a 5 minutos. */
export function parseRetryAfter(header: string | null | undefined, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  let seconds: number;
  if (/^\d+$/.test(trimmed)) {
    seconds = Number(trimmed);
  } else {
    const date = Date.parse(trimmed);
    if (Number.isNaN(date)) return undefined;
    seconds = Math.ceil((date - now) / 1000);
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.min(seconds, MAX_RETRY_AFTER_SEC);
}

/** Qualquer exceção do fluxo de análise vira um `DomainError`. */
export function toDomainError(error: unknown): DomainError {
  if (error instanceof AnalyzeError) return error.domain;
  if (error instanceof InvalidResponseError) return createDomainError('invalid_response');
  return createDomainError('unknown');
}
