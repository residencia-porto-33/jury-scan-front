import type { NormalizedIssue, Severidade } from '../../analysis/types';

export interface IssueFilter {
  /** Vazio = todas as severidades. */
  severidades: ReadonlySet<Severidade>;
  /** `undefined` = todas as categorias. */
  categoria: string | undefined;
}

export const EMPTY_FILTER: IssueFilter = { severidades: new Set(), categoria: undefined };

/** Mantém a ordem recebida (já ordenada pelo adapter). */
export function filterIssues(issues: readonly NormalizedIssue[], filter: IssueFilter): NormalizedIssue[] {
  return issues.filter(
    (issue) =>
      (filter.severidades.size === 0 || filter.severidades.has(issue.severidade)) &&
      (filter.categoria === undefined || issue.categoria === filter.categoria),
  );
}

export function listCategories(issues: readonly NormalizedIssue[]): string[] {
  return [...new Set(issues.map((issue) => issue.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function toggleSeveridade(filter: IssueFilter, severidade: Severidade): IssueFilter {
  const severidades = new Set(filter.severidades);
  if (severidades.has(severidade)) severidades.delete(severidade);
  else severidades.add(severidade);
  return { ...filter, severidades };
}

export function isFilterActive(filter: IssueFilter): boolean {
  return filter.severidades.size > 0 || filter.categoria !== undefined;
}
