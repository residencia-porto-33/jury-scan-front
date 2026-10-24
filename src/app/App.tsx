import { useEffect, useRef } from 'react';

import { AnalysisErrorAlert } from '../features/analysis/components/AnalysisErrorAlert';
import { AnalysisProgress } from '../features/analysis/components/AnalysisProgress';
import { useAnalysis } from '../features/analysis/hooks/useAnalysis';
import { statusMessage } from '../features/analysis/state/statusMessage';
import { InputPanel } from '../features/input/components/InputPanel';
import { LiveRegion } from '../shared/components/LiveRegion';

export function App() {
  const analysis = useAnalysis();
  const { state } = analysis;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorTitleRef = useRef<HTMLHeadingElement>(null);

  // Após erro, o foco vai para o título do alerta.
  useEffect(() => {
    if (state.status === 'error') errorTitleRef.current?.focus();
  }, [state]);

  const text = 'text' in state ? (state.text ?? '') : '';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
          <p className="text-xl font-semibold tracking-tight">JuryScan</p>
          <p className="text-sm text-fg-muted">Triagem assistiva de CNIS · revisão humana obrigatória</p>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6">
        <h1 className="text-2xl font-semibold">Analisar extrato do CNIS</h1>
        <InputPanel
          text={text}
          pdfMeta={'source' in state ? state.source : undefined}
          extraction={state.status === 'extracting' ? state.progress : undefined}
          submitting={state.status === 'submitting'}
          onTextChange={analysis.setText}
          onExtractionStart={analysis.extractionStarted}
          onExtractionProgress={analysis.extractionProgress}
          onExtractionFailed={analysis.extractionFailed}
          onSubmit={analysis.submit}
          textareaRef={textareaRef}
          footer={
            <>
              {state.status === 'submitting' ? <AnalysisProgress onCancel={analysis.cancel} /> : null}
              {state.status === 'error' ? (
                <AnalysisErrorAlert
                  error={state.error}
                  titleRef={errorTitleRef}
                  onRetry={analysis.retry}
                  onReviewText={() => {
                    analysis.backToInput();
                    textareaRef.current?.focus();
                  }}
                />
              ) : null}
            </>
          }
        />
        {state.status === 'success' ? (
          <section aria-label="Relatório">
            <h2 className="text-xl font-semibold">Relatório da triagem</h2>
            <p>{state.result.totals.total} achados</p>
          </section>
        ) : null}
      </main>
      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-3 text-sm text-fg-muted">
          Ferramenta de apoio à triagem. Não constitui parecer jurídico.
        </p>
      </footer>
      <LiveRegion message={statusMessage(state)} />
    </div>
  );
}
