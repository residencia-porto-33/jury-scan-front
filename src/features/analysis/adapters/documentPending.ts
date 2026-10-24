import { foldText } from '../../../shared/lib/text';

/**
 * O documento enviado não é um CNIS: a API devolve uma "pendência documental"
 * sem conclusão previdenciária.
 *
 * TODO(backend): o formato desse alerta não está no openapi.yaml. Por ora
 * reconhecemos pela categoria do achado. Confirmar o valor exato (ou um campo
 * dedicado, ex.: `status: "pendencia_documental"`) e ajustar só aqui.
 */
const PENDING_CATEGORY = /pendencia_documental|documento_(invalido|nao_reconhecido|nao_cnis)|nao_e_cnis/;

export function normalizeCategoryKey(categoria: string): string {
  return foldText(categoria)
    .trim()
    .replace(/[\s-]+/g, '_');
}

export function isDocumentPending(issues: ReadonlyArray<{ categoria: string }>): boolean {
  return issues.some((issue) => PENDING_CATEGORY.test(normalizeCategoryKey(issue.categoria)));
}
