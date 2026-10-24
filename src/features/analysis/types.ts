/**
 * Fonte única dos tipos do contrato com o backend.
 * Referência: docs/openapi.yaml (cópia de https://residencia-porto-33.github.io/docs-swagger/).
 */
import type { Origem } from '../input/types';

export type { Origem };

// ---------------------------------------------------------------------------
// Request — `AnalysisRequestBody`
// ---------------------------------------------------------------------------

export interface AnalyzeRequest {
  texto_input: string;
  origem: Origem;
}

// ---------------------------------------------------------------------------
// Response 200 — `AnalysisResult` (formato cru, como o backend envia)
// Só é usado para tipar fixtures; o app trata a resposta como `unknown` até
// passar por `normalizeAnalysis`.
// ---------------------------------------------------------------------------

export type Severidade = 'alta' | 'media' | 'baixa' | 'info';
export type Risco = 'alto' | 'medio' | 'baixo';

export interface RawIssue {
  identificador_exibicao: string;
  severidade: string;
  categoria: string;
  descricao?: string | null;
  evidencia: string;
  sugestao: string;
  impacto?: string | null;
  confianca: number;
}

export interface RawDocumentSummary {
  cpf?: string | null;
  nit_pis_pasep?: string | null;
  periodo?: string | null;
  // TODO(backend): o Swagger declara string[], mas o prompt prevê objetos; o adapter aceita ambos.
  vinculos?: Array<string | Record<string, unknown>> | null;
  contexto_beneficio?: string | null;
}

export interface RawAnalysisResponse {
  analysis_request_id?: string;
  status?: string;
  document_summary: RawDocumentSummary;
  issues: RawIssue[];
  severity_totals?: Partial<Record<Severidade | 'total', number>>;
  risco_agregado: string;
  acoes_prioritarias: string[];
  prompt_version?: string;
  modelo_versao?: string;
}

// ---------------------------------------------------------------------------
// Modelo normalizado — o único que os componentes de relatório conhecem.
// ---------------------------------------------------------------------------

export const SEVERIDADES: readonly Severidade[] = ['alta', 'media', 'baixa', 'info'];

export interface TextRange {
  start: number;
  end: number;
}

export interface NormalizedIssue {
  /** Chave única na lista (o identificador da IA pode, em tese, repetir). */
  key: string;
  identificador: string;
  severidade: Severidade;
  categoria: string;
  descricao: string | undefined;
  evidencia: string;
  sugestao: string;
  impacto: string | undefined;
  /** 0..1 — confiança do modelo, não certeza jurídica. */
  confianca: number;
  /** A evidência foi encontrada literalmente (normalizando espaços e caixa) no texto enviado. */
  evidenciaLocalizada: boolean;
  /** Posição da evidência no texto enviado, quando localizada. */
  evidenciaRange: TextRange | undefined;
}

export interface NormalizedSummary {
  cpf: string | undefined;
  nitPisPasep: string | undefined;
  periodo: string | undefined;
  vinculos: string[];
  contextoBeneficio: string | undefined;
}

export interface SeverityTotals {
  alta: number;
  media: number;
  baixa: number;
  info: number;
  total: number;
}

export interface NormalizedAnalysis {
  summary: NormalizedSummary;
  issues: NormalizedIssue[];
  /** Recalculados a partir de `issues` (os totais da API são ignorados para exibição). */
  totals: SeverityTotals;
  risco: Risco;
  acoesPrioritarias: string[];
  /** Achados descartados por não trazerem evidência. */
  discardedCount: number;
  /** O documento não foi reconhecido como CNIS: o relatório vira um aviso de pendência. */
  documentPending: boolean;
  meta: {
    analysisRequestId: string | undefined;
    promptVersion: string | undefined;
    modeloVersao: string | undefined;
  };
}

// ---------------------------------------------------------------------------
// Erros de domínio (US09)
// ---------------------------------------------------------------------------

export type DomainErrorKind =
  | 'invalid_input'
  | 'too_large'
  | 'invalid_response'
  | 'busy'
  | 'upstream'
  | 'timeout'
  | 'network'
  | 'cancelled'
  | 'unknown';

export interface DomainError {
  kind: DomainErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  /** Segundos sugeridos pelo servidor (`Retry-After`) antes de tentar de novo. */
  retryAfterSec?: number;
}
