import { SEVERIDADES, type Severidade, type SeverityTotals as Totals } from '../../analysis/types';
import { cx } from '../../../shared/lib/cx';
import { SEVERIDADE_VISUAL } from '../utils/labels';

interface SeverityTotalsProps {
  totals: Totals;
  selected: ReadonlySet<Severidade>;
  onToggle: (severidade: Severidade) => void;
  onShowAll: () => void;
}

/** Contadores que também funcionam como filtro (toggle buttons com aria-pressed). */
export function SeverityTotals({ totals, selected, onToggle, onShowAll }: SeverityTotalsProps) {
  return (
    <div role="group" aria-label="Filtrar achados por severidade" className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={selected.size === 0}
        onClick={onShowAll}
        className={cx(
          'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium',
          selected.size === 0
            ? 'border-fg bg-fg text-bg'
            : 'border-line-strong bg-surface text-fg hover:bg-surface-muted',
        )}
      >
        Todos <span className="tabular-nums">{totals.total}</span>
      </button>
      {SEVERIDADES.map((severidade) => {
        const visual = SEVERIDADE_VISUAL[severidade];
        const pressed = selected.has(severidade);
        return (
          <button
            key={severidade}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(severidade)}
            className={cx(
              'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium',
              visual.className,
              pressed
                ? 'ring-2 ring-current ring-offset-1 ring-offset-surface'
                : 'opacity-90 hover:opacity-100',
            )}
          >
            <span aria-hidden="true">{visual.icon}</span>
            {visual.label} <span className="tabular-nums">{totals[severidade]}</span>
          </button>
        );
      })}
    </div>
  );
}
