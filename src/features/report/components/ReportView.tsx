import { Printer } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';

import type { NormalizedAnalysis, NormalizedIssue } from '../../analysis/types';
import { Button } from '../../../shared/components/Button';
import { maskPersonalNumbers } from '../utils/mask';
import { DocumentPendingNotice } from './DocumentPendingNotice';
import { DocumentSummaryCard } from './DocumentSummaryCard';
import { IssueList } from './IssueList';
import { PriorityActions } from './PriorityActions';
import { RiskIndicator } from './RiskIndicator';
import { SourceTextPanel } from './SourceTextPanel';

interface ReportViewProps {
  result: NormalizedAnalysis;
  /** Texto exatamente como foi enviado (para "Ver no documento"). */
  sentText: string;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onNewAnalysis: () => void;
}

/**
 * Relatório da triagem. Recebe somente dados normalizados. Marcações de
 * "conferido", filtros e máscara ficam só em memória e somem com "Nova análise"
 * (o componente é remontado a cada resultado).
 */
export function ReportView({ result, sentText, titleRef, onNewAnalysis }: ReportViewProps) {
  const [checkedKeys, setCheckedKeys] = useState<ReadonlySet<string>>(new Set());
  const [hidePersonal, setHidePersonal] = useState(false);
  const [sourceView, setSourceView] = useState<{ issue: NormalizedIssue } | { issue: undefined } | null>(
    null,
  );
  const sourceHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  if (result.documentPending) {
    return <DocumentPendingNotice result={result} titleRef={titleRef} onNewAnalysis={onNewAnalysis} />;
  }

  function showInDocument(issue: NormalizedIssue) {
    lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSourceView({ issue });
    requestAnimationFrame(() => sourceHeadingRef.current?.focus());
  }

  function backToIssue() {
    lastTriggerRef.current?.focus();
  }

  function closeSource() {
    setSourceView(null);
    lastTriggerRef.current?.focus();
  }

  return (
    <section aria-labelledby="relatorio-titulo" className="print-body space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="relatorio-titulo" ref={titleRef} tabIndex={-1} className="text-2xl font-semibold">
          Relatório da triagem
        </h2>
        <Button
          variant="secondary"
          className="no-print"
          icon={<Printer className="size-4" />}
          onClick={() => window.print()}
        >
          Imprimir / salvar PDF
        </Button>
      </div>

      <RiskIndicator risco={result.risco} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <DocumentSummaryCard
            summary={result.summary}
            hidePersonal={hidePersonal}
            onTogglePersonal={() => setHidePersonal((value) => !value)}
          />
          <PriorityActions actions={result.acoesPrioritarias} />
          {sourceView ? (
            <div className="lg:sticky lg:top-[calc(var(--disclaimer-height)+1rem)]">
              <SourceTextPanel
                text={hidePersonal ? maskPersonalNumbers(sentText) : sentText}
                highlight={sourceView.issue?.evidenciaRange}
                fromIssueId={sourceView.issue?.identificador}
                headingRef={sourceHeadingRef}
                onBack={backToIssue}
                onClose={closeSource}
              />
            </div>
          ) : (
            <Button variant="ghost" className="no-print" onClick={() => setSourceView({ issue: undefined })}>
              Ver o texto enviado
            </Button>
          )}
        </div>

        <IssueList
          result={result}
          checkedKeys={checkedKeys}
          onCheckedChange={(key, checked) =>
            setCheckedKeys((current) => {
              const next = new Set(current);
              if (checked) next.add(key);
              else next.delete(key);
              return next;
            })
          }
          hidePersonal={hidePersonal}
          onShowInDocument={showInDocument}
        />
      </div>

      <p className="text-xs text-fg-muted">
        {result.meta.analysisRequestId ? `Identificador da análise: ${result.meta.analysisRequestId}. ` : ''}
        {result.meta.modeloVersao ? `Modelo: ${result.meta.modeloVersao}. ` : ''}
        {result.meta.promptVersion ? `Versão do prompt: ${result.meta.promptVersion}.` : ''}
      </p>
    </section>
  );
}
