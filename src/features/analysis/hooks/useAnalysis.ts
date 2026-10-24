import { useCallback, useEffect, useReducer, useRef } from 'react';

import { env } from '../../../shared/config/env';
import type { ExtractionProgress, PdfMeta } from '../../input/types';
import { validateText } from '../../input/validation';
import { normalizeAnalysis } from '../adapters/normalizeAnalysis';
import { analyzeCnis } from '../api/analyzeClient';
import { toDomainError } from '../api/errors';
import { analysisReducer, initialAnalysisState } from '../state/analysisReducer';
import type { Origem } from '../types';

export function useAnalysis() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const abortRef = useRef<AbortController | null>(null);

  // Desmontar a tela cancela a chamada em andamento.
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (text: string, origem: Origem) => {
    // Trava contra duplo envio, independente do ciclo de renderização.
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const raw = await analyzeCnis({ texto_input: text, origem }, { signal: controller.signal });
      dispatch({ type: 'SUCCEEDED', result: normalizeAnalysis(raw, text) });
    } catch (error) {
      dispatch({ type: 'FAILED', error: toDomainError(error) });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const submit = useCallback(() => {
    if (state.status !== 'ready' || abortRef.current) return;
    const validation = validateText(state.text, { minChars: env.minInputChars, maxChars: env.maxInputChars });
    if (!validation.ok) return;
    dispatch({ type: 'SUBMIT' });
    void run(state.text, state.origem);
  }, [state, run]);

  const retry = useCallback(() => {
    if (state.status !== 'error' || !state.error.retryable || abortRef.current) return;
    if (state.text === undefined || state.origem === undefined) return;
    dispatch({ type: 'RETRY' });
    void run(state.text, state.origem);
  }, [state, run]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  /** "Nova análise": descarta texto, resultado e qualquer chamada pendente. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  const setText = useCallback((text: string, origem: Origem, source?: PdfMeta) => {
    dispatch({ type: 'TEXT_CHANGED', text, origem, source });
  }, []);

  const backToInput = useCallback(() => dispatch({ type: 'EDIT' }), []);
  const extractionStarted = useCallback(() => dispatch({ type: 'EXTRACTION_STARTED' }), []);
  const extractionProgress = useCallback(
    (progress: ExtractionProgress) => dispatch({ type: 'EXTRACTION_PROGRESS', progress }),
    [],
  );
  const extractionFailed = useCallback(() => dispatch({ type: 'EXTRACTION_FAILED' }), []);

  return {
    state,
    submit,
    retry,
    cancel,
    reset,
    setText,
    backToInput,
    extractionStarted,
    extractionProgress,
    extractionFailed,
  };
}

export type AnalysisController = ReturnType<typeof useAnalysis>;
