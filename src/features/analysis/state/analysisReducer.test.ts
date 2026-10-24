import { describe, expect, it } from 'vitest';

import { createDomainError } from '../api/errors';
import type { NormalizedAnalysis } from '../types';
import {
  analysisReducer,
  initialAnalysisState,
  type AnalysisAction,
  type AnalysisState,
} from './analysisReducer';

const result = { issues: [] } as unknown as NormalizedAnalysis;
const source = { fileName: 'cnis.pdf', sizeBytes: 100, pageCount: 2, charCount: 50 };

const states: Record<AnalysisState['status'], AnalysisState> = {
  idle: { status: 'idle' },
  extracting: { status: 'extracting', progress: { page: 1, total: 3 } },
  ready: { status: 'ready', text: 'texto', origem: 'texto_colado' },
  submitting: { status: 'submitting', text: 'texto', origem: 'upload_pdf', source },
  success: { status: 'success', text: 'texto', origem: 'texto_colado', result },
  error: {
    status: 'error',
    error: createDomainError('timeout'),
    text: 'texto',
    origem: 'upload_pdf',
    source,
  },
};

const reduce = (state: AnalysisState, ...actions: AnalysisAction[]) => actions.reduce(analysisReducer, state);

describe('analysisReducer — transições válidas', () => {
  it('fluxo de texto colado: idle → ready → submitting → success', () => {
    const end = reduce(
      initialAnalysisState,
      { type: 'TEXT_CHANGED', text: 'abc', origem: 'texto_colado' },
      { type: 'SUBMIT' },
      { type: 'SUCCEEDED', result },
    );
    expect(end).toEqual({ status: 'success', text: 'abc', origem: 'texto_colado', result });
  });

  it('fluxo de PDF: extracting com progresso → ready com metadados', () => {
    const end = reduce(
      initialAnalysisState,
      { type: 'EXTRACTION_STARTED' },
      { type: 'EXTRACTION_PROGRESS', progress: { page: 2, total: 2 } },
      { type: 'TEXT_CHANGED', text: 'pdf', origem: 'upload_pdf', source },
    );
    expect(end).toEqual({ status: 'ready', text: 'pdf', origem: 'upload_pdf', source });
  });

  it('falha na extração volta para idle', () => {
    expect(reduce(states.extracting, { type: 'EXTRACTION_FAILED' })).toEqual({ status: 'idle' });
  });

  it('erro preserva o texto para "Tentar novamente"', () => {
    const error = createDomainError('busy', 10);
    const failed = reduce(states.submitting, { type: 'FAILED', error });
    expect(failed).toEqual({ status: 'error', error, text: 'texto', origem: 'upload_pdf', source });
    expect(reduce(failed, { type: 'RETRY' })).toEqual(states.submitting);
  });

  it('EDIT volta do erro para ready com o mesmo texto', () => {
    expect(reduce(states.error, { type: 'EDIT' })).toEqual({
      status: 'ready',
      text: 'texto',
      origem: 'upload_pdf',
      source,
    });
  });

  it('apagar o texto volta para idle', () => {
    expect(reduce(states.ready, { type: 'TEXT_CHANGED', text: '', origem: 'texto_colado' })).toEqual({
      status: 'idle',
    });
  });

  it.each(Object.values(states))('RESET leva qualquer estado (%o) para idle', (state) => {
    expect(reduce(state, { type: 'RESET' })).toEqual({ status: 'idle' });
  });
});

describe('analysisReducer — transições inválidas são no-op', () => {
  const noops: Array<[AnalysisState['status'], AnalysisAction]> = [
    ['idle', { type: 'SUBMIT' }],
    ['extracting', { type: 'SUBMIT' }],
    ['submitting', { type: 'SUBMIT' }],
    ['success', { type: 'SUBMIT' }],
    ['error', { type: 'SUBMIT' }],
    ['idle', { type: 'SUCCEEDED', result }],
    ['ready', { type: 'SUCCEEDED', result }],
    ['idle', { type: 'FAILED', error: createDomainError('unknown') }],
    ['success', { type: 'FAILED', error: createDomainError('unknown') }],
    ['idle', { type: 'RETRY' }],
    ['ready', { type: 'RETRY' }],
    ['idle', { type: 'EXTRACTION_PROGRESS', progress: { page: 1, total: 1 } }],
    ['ready', { type: 'EXTRACTION_FAILED' }],
    ['submitting', { type: 'EXTRACTION_STARTED' }],
    ['success', { type: 'EXTRACTION_STARTED' }],
    ['submitting', { type: 'TEXT_CHANGED', text: 'novo', origem: 'texto_colado' }],
    ['success', { type: 'TEXT_CHANGED', text: 'novo', origem: 'texto_colado' }],
    ['ready', { type: 'EDIT' }],
  ];

  it.each(noops)('%s + %o', (status, action) => {
    const state = states[status];
    expect(analysisReducer(state, action)).toBe(state);
  });

  it('RETRY não reenvia erro não recuperável', () => {
    const state: AnalysisState = {
      ...states.error,
      error: createDomainError('invalid_input'),
    } as AnalysisState;
    expect(analysisReducer(state, { type: 'RETRY' })).toBe(state);
  });
});
