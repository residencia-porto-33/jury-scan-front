import { CheckCircle2, FilterX } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import type { NormalizedAnalysis, NormalizedIssue } from '../../analysis/types';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { pluralize } from '../../../shared/lib/text';
import {
  EMPTY_FILTER,
  filterIssues,
  isFilterActive,
  listCategories,
  toggleSeveridade,
} from '../utils/filters';
import { IssueCard } from './IssueCard';
import { IssueFilters } from './IssueFilters';
import { SeverityTotals } from './SeverityTotals';

interface IssueListProps {
  result: NormalizedAnalysis;
  checkedKeys: ReadonlySet<string>;
  onCheckedChange: (key: string, checked: boolean) => void;
  hidePersonal: boolean;
  onShowInDocument: (issue: NormalizedIssue) => void;
}

export function IssueList({
  result,
  checkedKeys,
  onCheckedChange,
  hidePersonal,
  onShowInDocument,
}: IssueListProps) {
  const headingId = useId();
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const categories = useMemo(() => listCategories(result.issues), [result.issues]);
  const visible = filterIssues(result.issues, filter);
  const checkedCount = result.issues.filter((issue) => checkedKeys.has(issue.key)).length;
  const total = result.issues.length;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-lg font-semibold">
          Achados da triagem
        </h3>
        {total > 0 ? (
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg tabular-nums">
              {checkedCount} de {total}
            </span>{' '}
            conferidos
          </p>
        ) : null}
      </div>

      {total > 0 ? (
        <progress
          className="h-1.5 w-full accent-risk-baixo"
          max={total}
          value={checkedCount}
          aria-label="Achados conferidos"
        />
      ) : null}

      {result.discardedCount > 0 ? (
        <p className="rounded-md border border-line bg-surface-muted p-2 text-sm text-fg-muted">
          {result.discardedCount === 1
            ? '1 achado foi descartado por não apresentar evidência.'
            : `${result.discardedCount} achados foram descartados por não apresentarem evidência.`}
        </p>
      ) : null}

      {total === 0 ? (
        <Alert tone="success" title="Nenhuma inconsistência identificada pela triagem automática">
          <p>Isso não dispensa a revisão profissional.</p>
        </Alert>
      ) : (
        <>
          <div className="no-print space-y-3 rounded-xl border border-line bg-surface p-3">
            <SeverityTotals
              totals={result.totals}
              selected={filter.severidades}
              onToggle={(severidade) => setFilter((current) => toggleSeveridade(current, severidade))}
              onShowAll={() => setFilter((current) => ({ ...current, severidades: new Set() }))}
            />
            <IssueFilters
              categories={categories}
              categoria={filter.categoria}
              onCategoriaChange={(categoria) => setFilter((current) => ({ ...current, categoria }))}
            />
          </div>

          <p role="status" className="text-sm text-fg-muted">
            {isFilterActive(filter)
              ? `Mostrando ${visible.length} de ${pluralize(total, 'achado', 'achados')}.`
              : `${pluralize(total, 'achado', 'achados')}, do mais grave ao menos grave.`}
          </p>

          {visible.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line-strong p-4">
              <p>Nenhum achado com os filtros selecionados.</p>
              <Button
                variant="secondary"
                size="sm"
                icon={<FilterX className="size-4" />}
                onClick={() => setFilter(EMPTY_FILTER)}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((issue) => (
                <li key={issue.key}>
                  <IssueCard
                    issue={issue}
                    checked={checkedKeys.has(issue.key)}
                    onCheckedChange={(checked) => onCheckedChange(issue.key, checked)}
                    hidePersonal={hidePersonal}
                    onShowInDocument={onShowInDocument}
                  />
                </li>
              ))}
            </ul>
          )}

          {checkedCount === total ? (
            <p className="flex items-center gap-2 text-sm font-medium text-risk-baixo">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Todos os achados foram conferidos.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
