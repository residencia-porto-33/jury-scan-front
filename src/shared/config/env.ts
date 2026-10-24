/**
 * Leitura tipada das variáveis de ambiente (todas públicas — prefixo VITE_).
 * Valores ausentes ou inválidos caem no default.
 */

function readNumber(raw: string | undefined, fallback: number, min = 1): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return raw.trim().toLowerCase() === 'true';
}

function readUrl(raw: string | undefined, fallback: string): string {
  const value = raw?.trim() || fallback;
  return value.replace(/\/+$/, '');
}

const vars = import.meta.env;

export const env = {
  apiBaseUrl: readUrl(vars.VITE_API_BASE_URL, 'http://localhost:8000'),
  requestTimeoutMs: readNumber(vars.VITE_REQUEST_TIMEOUT_MS, 90_000),
  // TODO(backend): o openapi.yaml só declara `minLength: 1` em `texto_input`.
  // Confirmar com o backend os limites reais de min/max e ajustar os defaults.
  minInputChars: readNumber(vars.VITE_MIN_INPUT_CHARS, 200),
  maxInputChars: readNumber(vars.VITE_MAX_INPUT_CHARS, 200_000),
  maxPdfMb: readNumber(vars.VITE_MAX_PDF_MB, 20),
  pdfMinCharsPerPage: readNumber(vars.VITE_PDF_MIN_CHARS_PER_PAGE, 50, 0),
  useMocks: readBoolean(vars.VITE_USE_MOCKS, false),
  isDev: vars.DEV,
} as const;

export type Env = typeof env;
