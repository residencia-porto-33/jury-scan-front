import { logger } from '../../../shared/lib/logger';
import { foldText } from '../../../shared/lib/text';
import { InvalidResponseError } from '../api/errors';
import {
  SEVERIDADES,
  type NormalizedAnalysis,
  type NormalizedIssue,
  type NormalizedSummary,
  type Risco,
  type Severidade,
  type SeverityTotals,
} from '../types';
import { isDocumentPending } from './documentPending';
import { createEvidenceLocator } from './locateEvidence';

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireString(record: UnknownRecord, field: string): string {
  const value = record[field];
  if (!isNonEmptyString(value)) throw new InvalidResponseError(`campo "${field}" ausente ou inválido`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

// ---------------------------------------------------------------------------
// Enums tolerantes a acento e caixa ("média", "Media", "MÉDIO"...)
// ---------------------------------------------------------------------------

const SEVERIDADE_ALIASES: Record<string, Severidade> = {
  alta: 'alta',
  media: 'media',
  baixa: 'baixa',
  info: 'info',
  informativa: 'info',
  informativo: 'info',
};

const RISCO_ALIASES: Record<string, Risco> = {
  alto: 'alto',
  medio: 'medio',
  baixo: 'baixo',
};

function normalizeEnum<T>(value: unknown, aliases: Record<string, T>, field: string): T {
  if (typeof value !== 'string') throw new InvalidResponseError(`campo "${field}" ausente`);
  const normalized = aliases[foldText(value.trim())];
  if (normalized === undefined) throw new InvalidResponseError(`valor desconhecido em "${field}"`);
  return normalized;
}

// ---------------------------------------------------------------------------
// Confiança
// ---------------------------------------------------------------------------

function normalizeConfianca(value: unknown): number {
  const number = typeof value === 'string' ? Number(value.replace('%', '').replace(',', '.')) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) {
    throw new InvalidResponseError('campo "confianca" ausente ou inválido');
  }
  // Aceita escala 0–100 por tolerância (o contrato é 0–1).
  const scaled = number > 1 ? number / 100 : number;
  return Math.min(1, Math.max(0, scaled));
}

// ---------------------------------------------------------------------------
// Resumo documental — ausente vira `undefined` (UI mostra "Não identificado")
// ---------------------------------------------------------------------------

const PLACEHOLDERS = new Set([
  '',
  '-',
  '--',
  '—',
  'n/a',
  'na',
  'n.a.',
  'n/d',
  'nd',
  'null',
  'none',
  'undefined',
  'nao identificado',
  'nao identificada',
  'nao informado',
  'nao informada',
  'nao encontrado',
  'nao encontrada',
  'nao disponivel',
  'desconhecido',
]);

function summaryValue(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const folded = foldText(trimmed).replace(/[.\s]+$/, '');
  return PLACEHOLDERS.has(folded) ? undefined : trimmed;
}

function vinculoToText(value: unknown): string | undefined {
  if (isRecord(value)) {
    const parts = Object.values(value)
      .map(summaryValue)
      .filter((part): part is string => part !== undefined);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }
  return summaryValue(value);
}

function normalizeSummary(raw: unknown): NormalizedSummary {
  if (!isRecord(raw)) throw new InvalidResponseError('campo "document_summary" ausente');
  const vinculos = Array.isArray(raw.vinculos)
    ? raw.vinculos.map(vinculoToText).filter((v): v is string => v !== undefined)
    : [];
  return {
    cpf: summaryValue(raw.cpf),
    nitPisPasep: summaryValue(raw.nit_pis_pasep),
    periodo: summaryValue(raw.periodo),
    vinculos,
    contextoBeneficio: summaryValue(raw.contexto_beneficio),
  };
}

// ---------------------------------------------------------------------------
// Achados
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2, info: 3 };

export function compareIssues(a: NormalizedIssue, b: NormalizedIssue): number {
  return (
    SEVERITY_ORDER[a.severidade] - SEVERITY_ORDER[b.severidade] ||
    b.confianca - a.confianca ||
    a.identificador.localeCompare(b.identificador, 'pt-BR', { numeric: true })
  );
}

function normalizeIssues(
  raw: unknown,
  sentText: string,
): { issues: NormalizedIssue[]; discardedCount: number } {
  if (!Array.isArray(raw)) throw new InvalidResponseError('campo "issues" ausente');
  const locate = createEvidenceLocator(sentText);
  const issues: NormalizedIssue[] = [];
  let discardedCount = 0;

  raw.forEach((item: unknown, index) => {
    if (!isRecord(item)) throw new InvalidResponseError('item de "issues" inválido');

    // Achado sem evidência não é exibido como achado (requisito central do produto).
    if (!isNonEmptyString(item.evidencia)) {
      discardedCount += 1;
      return;
    }

    const evidencia = item.evidencia.trim();
    const identificador = requireString(item, 'identificador_exibicao');
    const range = locate(evidencia);
    issues.push({
      key: `${identificador}#${index}`,
      identificador,
      severidade: normalizeEnum(item.severidade, SEVERIDADE_ALIASES, 'severidade'),
      categoria: requireString(item, 'categoria'),
      descricao: optionalString(item.descricao),
      evidencia,
      sugestao: requireString(item, 'sugestao'),
      impacto: optionalString(item.impacto),
      confianca: normalizeConfianca(item.confianca),
      evidenciaLocalizada: range !== undefined,
      evidenciaRange: range,
    });
  });

  return { issues: issues.sort(compareIssues), discardedCount };
}

// ---------------------------------------------------------------------------
// Totais — sempre recalculados a partir da lista validada (US07)
// ---------------------------------------------------------------------------

export function computeTotals(issues: ReadonlyArray<Pick<NormalizedIssue, 'severidade'>>): SeverityTotals {
  const totals: SeverityTotals = { alta: 0, media: 0, baixa: 0, info: 0, total: issues.length };
  for (const issue of issues) totals[issue.severidade] += 1;
  return totals;
}

function warnIfTotalsDiverge(raw: unknown, computed: SeverityTotals) {
  if (!isRecord(raw)) return;
  const diverges = SEVERIDADES.some((sev) => typeof raw[sev] === 'number' && raw[sev] !== computed[sev]);
  if (!diverges) return;
  // Só números: nunca conteúdo do documento.
  logger.warn('severity_totals_mismatch', {
    apiAlta: typeof raw.alta === 'number' ? raw.alta : null,
    apiMedia: typeof raw.media === 'number' ? raw.media : null,
    apiBaixa: typeof raw.baixa === 'number' ? raw.baixa : null,
    apiInfo: typeof raw.info === 'number' ? raw.info : null,
    alta: computed.alta,
    media: computed.media,
    baixa: computed.baixa,
    info: computed.info,
  });
}

// ---------------------------------------------------------------------------
// Entrada pública
// ---------------------------------------------------------------------------

/**
 * Valida e normaliza a resposta crua de `POST /api/analyze`.
 * @param sentText texto exatamente como foi enviado — usado para localizar as evidências.
 * @throws InvalidResponseError quando a resposta foge do contrato.
 */
export function normalizeAnalysis(raw: unknown, sentText: string): NormalizedAnalysis {
  if (!isRecord(raw)) throw new InvalidResponseError('corpo não é um objeto');

  const summary = normalizeSummary(raw.document_summary);
  const { issues, discardedCount } = normalizeIssues(raw.issues, sentText);
  const risco = normalizeEnum(raw.risco_agregado, RISCO_ALIASES, 'risco_agregado');

  if (!Array.isArray(raw.acoes_prioritarias)) {
    throw new InvalidResponseError('campo "acoes_prioritarias" ausente');
  }
  const acoesPrioritarias = raw.acoes_prioritarias
    .map(optionalString)
    .filter((acao): acao is string => acao !== undefined);

  const totals = computeTotals(issues);
  warnIfTotalsDiverge(raw.severity_totals, totals);

  return {
    summary,
    issues,
    totals,
    risco,
    acoesPrioritarias,
    discardedCount,
    documentPending: isDocumentPending(issues),
    meta: {
      analysisRequestId: optionalString(raw.analysis_request_id),
      promptVersion: optionalString(raw.prompt_version),
      modeloVersao: optionalString(raw.modelo_versao),
    },
  };
}
