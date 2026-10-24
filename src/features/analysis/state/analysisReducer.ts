import type { ExtractionProgress, PdfMeta } from '../../input/types';
import type { DomainError, NormalizedAnalysis, Origem } from '../types';

/**
 * Estados do documento (US04): Carregando = `extracting` (PDF lido localmente);
 * Processando = `submitting` (aguardando /api/analyze); Sucesso; Erro.
 */
export type AnalysisState =
  | { status: 'idle' }
  | { status: 'extracting'; progress: ExtractionProgress }
  | { status: 'ready'; text: string; origem: Origem; source?: PdfMeta }
  | { status: 'submitting'; text: string; origem: Origem; source?: PdfMeta }
  | { status: 'success'; text: string; origem: Origem; source?: PdfMeta; result: NormalizedAnalysis }
  | { status: 'error'; error: DomainError; text?: string; origem?: Origem; source?: PdfMeta };

export type AnalysisAction =
  | { type: 'EXTRACTION_STARTED' }
  | { type: 'EXTRACTION_PROGRESS'; progress: ExtractionProgress }
  | { type: 'EXTRACTION_FAILED' }
  | { type: 'TEXT_CHANGED'; text: string; origem: Origem; source?: PdfMeta | undefined }
  | { type: 'SUBMIT' }
  | { type: 'SUCCEEDED'; result: NormalizedAnalysis }
  | { type: 'FAILED'; error: DomainError }
  | { type: 'RETRY' }
  | { type: 'EDIT' }
  | { type: 'RESET' };

export const initialAnalysisState: AnalysisState = { status: 'idle' };

function withSource<T extends object>(base: T, source: PdfMeta | undefined): T & { source?: PdfMeta } {
  return source ? { ...base, source } : base;
}

/** Transições inválidas devolvem o próprio estado (no-op). */
export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'EXTRACTION_STARTED':
      if (state.status === 'submitting' || state.status === 'success') return state;
      return { status: 'extracting', progress: { page: 0, total: 0 } };

    case 'EXTRACTION_PROGRESS':
      if (state.status !== 'extracting') return state;
      return { status: 'extracting', progress: action.progress };

    case 'EXTRACTION_FAILED':
      if (state.status !== 'extracting') return state;
      return { status: 'idle' };

    case 'TEXT_CHANGED':
      if (state.status === 'submitting' || state.status === 'success') return state;
      if (action.text.length === 0) return { status: 'idle' };
      return withSource({ status: 'ready', text: action.text, origem: action.origem }, action.source);

    case 'SUBMIT':
      if (state.status !== 'ready') return state;
      return withSource({ status: 'submitting', text: state.text, origem: state.origem }, state.source);

    case 'SUCCEEDED':
      if (state.status !== 'submitting') return state;
      return withSource(
        { status: 'success', text: state.text, origem: state.origem, result: action.result },
        state.source,
      );

    case 'FAILED':
      if (state.status !== 'submitting') return state;
      return withSource(
        { status: 'error', error: action.error, text: state.text, origem: state.origem },
        state.source,
      );

    case 'RETRY':
      if (state.status !== 'error' || !state.error.retryable) return state;
      if (state.text === undefined || state.origem === undefined) return state;
      return withSource({ status: 'submitting', text: state.text, origem: state.origem }, state.source);

    case 'EDIT':
      if (state.status !== 'error') return state;
      if (state.text === undefined || state.origem === undefined) return { status: 'idle' };
      return withSource({ status: 'ready', text: state.text, origem: state.origem }, state.source);

    case 'RESET':
      return initialAnalysisState;
  }
}
