import { useState } from 'react';

import { InputPanel } from '../features/input/components/InputPanel';
import type { ExtractionProgress, PdfMeta } from '../features/input/types';

export function App() {
  // Estado provisório da Etapa 1; a Etapa 2 troca por useAnalysis (reducer).
  const [text, setText] = useState('');
  const [pdfMeta, setPdfMeta] = useState<PdfMeta | undefined>();
  const [extraction, setExtraction] = useState<ExtractionProgress | undefined>();

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
          pdfMeta={pdfMeta}
          extraction={extraction}
          submitting={false}
          onTextChange={(value, _origem, meta) => {
            setText(value);
            setPdfMeta(meta);
            setExtraction(undefined);
          }}
          onExtractionStart={() => setExtraction({ page: 0, total: 0 })}
          onExtractionProgress={setExtraction}
          onExtractionFailed={() => setExtraction(undefined)}
          onSubmit={() => undefined}
        />
      </main>
      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-3 text-sm text-fg-muted">
          Ferramenta de apoio à triagem. Não constitui parecer jurídico.
        </p>
      </footer>
    </div>
  );
}
