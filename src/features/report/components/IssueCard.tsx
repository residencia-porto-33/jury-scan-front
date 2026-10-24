import { useId } from 'react';

import type { NormalizedIssue } from '../../analysis/types';
import { cx } from '../../../shared/lib/cx';
import { formatConfianca, SEVERIDADE_VISUAL } from '../utils/labels';
import { maskPersonalNumbers } from '../utils/mask';
import { EvidenceBlock } from './EvidenceBlock';
import { SeverityBadge } from './SeverityBadge';

interface IssueCardProps {
  issue: NormalizedIssue;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hidePersonal: boolean;
  onShowInDocument: (issue: NormalizedIssue) => void;
}

export function IssueCard({
  issue,
  checked,
  onCheckedChange,
  hidePersonal,
  onShowInDocument,
}: IssueCardProps) {
  const headingId = useId();
  const confidenceHintId = useId();
  const text = (value: string) => (hidePersonal ? maskPersonalNumbers(value) : value);
  const percent = formatConfianca(issue.confianca);

  return (
    <article
      aria-labelledby={headingId}
      className={cx(
        'print-break-avoid space-y-4 rounded-xl border bg-surface p-4 sm:p-5',
        checked ? 'border-risk-baixo' : 'border-line',
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 id={headingId} className="font-mono text-base font-semibold">
            {issue.identificador}
            <span className="sr-only">
              , severidade {SEVERIDADE_VISUAL[issue.severidade].label.toLowerCase()}, {issue.categoria}
            </span>
          </h4>
          <SeverityBadge severidade={issue.severidade} />
        </div>
        <p className="font-medium">{issue.categoria}</p>
      </div>

      {issue.descricao ? <p className="leading-relaxed">{text(issue.descricao)}</p> : null}

      <EvidenceBlock
        evidencia={text(issue.evidencia)}
        localizada={issue.evidenciaLocalizada}
        issueId={issue.identificador}
        onShowInDocument={issue.evidenciaLocalizada ? () => onShowInDocument(issue) : undefined}
      />

      <dl className="grid gap-3 sm:grid-cols-2">
        {issue.impacto ? (
          <div>
            <dt className="text-sm font-semibold text-fg-muted">Impacto</dt>
            <dd className="mt-0.5">{text(issue.impacto)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-sm font-semibold text-fg-muted">Sugestão</dt>
          <dd className="mt-0.5">{text(issue.sugestao)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-3">
        <div className="min-w-48 flex-1 space-y-1">
          <p className="text-sm font-medium" aria-describedby={confidenceHintId}>
            Confiança da IA: <span className="tabular-nums">{percent}</span>
          </p>
          <div aria-hidden="true" className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-fg-muted" style={{ width: percent }} />
          </div>
          <p id={confidenceHintId} className="text-xs text-fg-muted">
            Indica a confiança do modelo, não certeza jurídica.
          </p>
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="size-5 accent-primary"
          />
          Conferido <span className="sr-only">({issue.identificador})</span>
        </label>
      </div>
    </article>
  );
}
