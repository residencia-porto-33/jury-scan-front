import { ClipboardPaste, FileUp, Search } from 'lucide-react';
import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';

import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Tabs } from '../../../shared/components/Tabs';
import { env } from '../../../shared/config/env';
import { looksLikeCnis } from '../cnisHeuristics';
import type { ExtractionProgress, Origem, PdfMeta } from '../types';
import { validateText } from '../validation';
import { PdfUploadTab } from './PdfUploadTab';
import { TextInputTab } from './TextInputTab';

type InputTab = 'texto' | 'pdf';

export interface InputPanelProps {
  text: string;
  pdfMeta: PdfMeta | undefined;
  extraction: ExtractionProgress | undefined;
  submitting: boolean;
  onTextChange: (text: string, origem: Origem, meta?: PdfMeta) => void;
  onExtractionStart: () => void;
  onExtractionProgress: (progress: ExtractionProgress) => void;
  onExtractionFailed: () => void;
  onSubmit: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Conteúdo exibido abaixo do botão (ex.: estado "Processando"). */
  footer?: ReactNode;
}

export function InputPanel({
  text,
  pdfMeta,
  extraction,
  submitting,
  onTextChange,
  onExtractionStart,
  onExtractionProgress,
  onExtractionFailed,
  onSubmit,
  textareaRef,
  footer,
}: InputPanelProps) {
  const headingId = useId();
  const reasonId = useId();
  const [tab, setTab] = useState<InputTab>('texto');
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const validation = validateText(text, { minChars: env.minInputChars, maxChars: env.maxInputChars });
  const blocked = !validation.ok || submitting || extraction !== undefined;
  const notCnisWarning = validation.ok && !looksLikeCnis(text);

  function goToTextTab() {
    setTab('texto');
    // Espera o painel aparecer antes de focar.
    requestAnimationFrame(() => (textareaRef ?? localTextareaRef).current?.focus());
  }

  function handleTypedText(value: string) {
    if (value.length === 0) {
      onTextChange('', 'texto_colado');
      return;
    }
    // Texto vindo do PDF e editado continua com origem "upload_pdf".
    onTextChange(value, pdfMeta ? 'upload_pdf' : 'texto_colado', pdfMeta);
  }

  const reason = submitting
    ? 'Análise em andamento.'
    : extraction
      ? 'Aguarde a leitura do PDF terminar.'
      : validation.ok
        ? undefined
        : validation.message;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6"
    >
      <h2 id={headingId} className="mb-4 text-lg font-semibold">
        Documento para análise
      </h2>

      <Tabs<InputTab>
        label="Forma de entrada do CNIS"
        selectedId={tab}
        onSelect={setTab}
        items={[
          {
            id: 'texto',
            label: 'Colar texto',
            icon: <ClipboardPaste className="size-4" />,
            content: (
              <TextInputTab
                text={text}
                onChange={handleTypedText}
                readOnly={submitting || extraction !== undefined}
                errorMessage={
                  validation.ok || validation.reason !== 'too_long' ? undefined : validation.message
                }
                textareaRef={textareaRef ?? localTextareaRef}
              />
            ),
          },
          {
            id: 'pdf',
            label: 'Enviar PDF',
            icon: <FileUp className="size-4" />,
            content: (
              <PdfUploadTab
                text={text}
                meta={pdfMeta}
                extraction={extraction}
                busy={submitting}
                onExtractionStart={onExtractionStart}
                onExtractionProgress={onExtractionProgress}
                onExtractionFailed={onExtractionFailed}
                onExtracted={(extracted, meta) => onTextChange(extracted, 'upload_pdf', meta)}
                onEditText={goToTextTab}
                onGoToTextTab={goToTextTab}
              />
            ),
          },
        ]}
      />

      <div className="mt-6 space-y-3 border-t border-line pt-4">
        {notCnisWarning ? (
          <Alert tone="warning" title="Não identificamos marcadores típicos de um CNIS">
            <p>
              Deseja analisar mesmo assim? Procuramos termos como “CNIS”, “NIT”, “Relações Previdenciárias” e
              “Remunerações”. A decisão final sobre o documento é feita na análise.
            </p>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            icon={<Search className="size-4" />}
            onClick={onSubmit}
            softDisabled={blocked}
            aria-describedby={reason ? reasonId : undefined}
          >
            {notCnisWarning ? 'Analisar mesmo assim' : 'Analisar'}
          </Button>
          {reason ? (
            <p id={reasonId} className="text-sm text-fg-muted">
              {reason}
            </p>
          ) : null}
        </div>
        {footer}
      </div>
    </section>
  );
}
