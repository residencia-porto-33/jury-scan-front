import { formatNumber, pluralize } from '../../../shared/lib/text';
import type { Risco } from '../types';
import type { AnalysisState } from './analysisReducer';

const RISCO_LABEL: Record<Risco, string> = { alto: 'alto', medio: 'médio', baixo: 'baixo' };

/** Texto anunciado na região aria-live. Só metadados — nunca conteúdo do documento. */
export function statusMessage(state: AnalysisState): string {
  switch (state.status) {
    case 'idle':
      return '';
    case 'extracting':
      return 'Lendo o PDF no navegador.';
    case 'ready':
      return state.source
        ? `PDF lido: ${pluralize(state.source.pageCount, 'página', 'páginas')}, ${formatNumber(state.source.charCount)} caracteres.`
        : '';
    case 'submitting':
      return 'Analisando documento.';
    case 'success': {
      const { result } = state;
      if (result.documentPending) return 'Análise concluída: documento não reconhecido como CNIS.';
      return `Análise concluída: ${pluralize(result.totals.total, 'achado', 'achados')}, risco ${RISCO_LABEL[result.risco]}.`;
    }
    case 'error':
      return `${state.error.title}. ${state.error.message}`;
  }
}
