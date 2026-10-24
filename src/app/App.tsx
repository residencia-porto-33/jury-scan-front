import { useEffect, useRef } from 'react';

import { AnalysisErrorAlert } from '../features/analysis/components/AnalysisErrorAlert';
import { AnalysisProgress } from '../features/analysis/components/AnalysisProgress';
import { useAnalysis } from '../features/analysis/hooks/useAnalysis';
import { statusMessage } from '../features/analysis/state/statusMessage';
import { InputPanel, type InputPanelHandle } from '../features/input/components/InputPanel';
import { InputSummaryBar } from '../features/input/components/InputSummaryBar';
import { Disclaimer } from '../features/report/components/Disclaimer';
import { ReportView } from '../features/report/components/ReportView';
import { LiveRegion } from '../shared/components/LiveRegion';

export function App() {
  const analysis = useAnalysis();
  const { state } = analysis;
  const inputRef = useRef<InputPanelHandle>(null);
  const errorTitleRef = useRef<HTMLHeadingElement>(null);
  const reportTitleRef = useRef<HTMLHeadingElement>(null);

  // Foco: título do relatório ao concluir; título do alerta após erro.
  useEffect(() => {
    if (state.status === 'success') reportTitleRef.current?.focus();
    if (state.status === 'error') errorTitleRef.current?.focus();
  }, [state.status]);

  const text = 'text' in state ? (state.text ?? '') : '';
  const source = 'source' in state ? state.source : undefined;

  function startNewAnalysis() {
    analysis.reset();
    // Depois de limpar, o foco volta para o início do formulário.
    requestAnimationFrame(() => document.getElementById('titulo-pagina')?.focus());
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
          <p className="text-xl font-semibold tracking-tight">
            Jury<span className="text-primary">Scan</span>
          </p>
          <p className="text-sm text-fg-muted">Triagem assistiva de CNIS · revisão humana obrigatória</p>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="w-full flex-1">
        {state.status === 'success' ? <Disclaimer /> : null}
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
          <h1 id="titulo-pagina" tabIndex={-1} className="no-print text-2xl font-semibold">
            Analisar extrato do CNIS
          </h1>

          {state.status === 'success' ? (
            <>
              <InputSummaryBar text={text} source={source} onNewAnalysis={startNewAnalysis} />
              <ReportView
                result={state.result}
                sentText={state.text}
                titleRef={reportTitleRef}
                onNewAnalysis={startNewAnalysis}
              />
            </>
          ) : (
            <InputPanel
              text={text}
              pdfMeta={source}
              extraction={state.status === 'extracting' ? state.progress : undefined}
              submitting={state.status === 'submitting'}
              onTextChange={analysis.setText}
              onExtractionStart={analysis.extractionStarted}
              onExtractionProgress={analysis.extractionProgress}
              onExtractionFailed={analysis.extractionFailed}
              onSubmit={analysis.submit}
              handleRef={inputRef}
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
                        inputRef.current?.focusText();
                      }}
                    />
                  ) : null}
                </>
              }
            />
          )}
        </div>
        <LiveRegion message={statusMessage(state)} />
      </main>

      <footer className="no-print border-t border-line bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-3 text-sm text-fg-muted">
          Ferramenta de apoio à triagem. Não concede nem indefere benefícios e não constitui parecer jurídico.
          Nenhum documento é armazenado: o texto fica só nesta aba até ser enviado para análise.
        </p>
      </footer>
    </div>
  );
}
