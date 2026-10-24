import { FileUp } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';

import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { env } from '../../../shared/config/env';
import { cx } from '../../../shared/lib/cx';
import { formatNumber } from '../../../shared/lib/text';
import { extractPdfText, PdfExtractionError } from '../pdf/extractPdfText';
import type { ExtractionProgress, PdfMeta } from '../types';
import { hasPdfMagicBytes, isLikelyImageOnlyPdf, validatePdfFile } from '../validation';
import { ExtractedPreview } from './ExtractedPreview';

interface FileProblem {
  title: string;
  message: string;
  /** PDF escaneado: oferece atalho para colar o texto. */
  suggestPaste?: boolean;
}

const IMAGE_ONLY_MESSAGE =
  'Este PDF parece ser uma imagem escaneada, sem texto selecionável. Use um PDF baixado direto do Meu INSS, aplique OCR no arquivo ou cole o texto manualmente.';

const EXTRACTION_PROBLEMS: Record<PdfExtractionError['kind'], FileProblem | undefined> = {
  password: {
    title: 'PDF protegido por senha',
    message:
      'Não conseguimos abrir este PDF porque ele tem senha. Remova a proteção ou cole o texto manualmente.',
    suggestPaste: true,
  },
  corrupted: {
    title: 'PDF danificado',
    message: 'O arquivo parece estar corrompido ou incompleto. Baixe o CNIS novamente e tente outra vez.',
  },
  cancelled: undefined,
  unknown: {
    title: 'Não foi possível ler o PDF',
    message: 'Algo impediu a leitura deste arquivo. Tente outro arquivo ou cole o texto manualmente.',
    suggestPaste: true,
  },
};

interface PdfUploadTabProps {
  text: string;
  meta: PdfMeta | undefined;
  extraction: ExtractionProgress | undefined;
  busy: boolean;
  onExtractionStart: () => void;
  onExtractionProgress: (progress: ExtractionProgress) => void;
  onExtractionFailed: () => void;
  onExtracted: (text: string, meta: PdfMeta) => void;
  onEditText: () => void;
  onGoToTextTab: () => void;
}

export function PdfUploadTab({
  text,
  meta,
  extraction,
  busy,
  onExtractionStart,
  onExtractionProgress,
  onExtractionFailed,
  onExtracted,
  onEditText,
  onGoToTextTab,
}: PdfUploadTabProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [problem, setProblem] = useState<FileProblem | undefined>();
  const [dragging, setDragging] = useState(false);
  const [replacing, setReplacing] = useState(false);

  // Sai da aba ou desmonta: interrompe uma extração em andamento.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File) {
    setProblem(undefined);
    setReplacing(false);

    const check = validatePdfFile(file, env.maxPdfMb);
    if (!check.ok) {
      setProblem({ title: 'Arquivo não aceito', message: check.message });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    onExtractionStart();

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasPdfMagicBytes(bytes)) {
        onExtractionFailed();
        setProblem({
          title: 'Arquivo não aceito',
          message: 'Este arquivo não é um PDF válido. Escolha um arquivo .pdf.',
        });
        return;
      }
      // Os bytes são transferidos para o worker do pdf.js e não ficam referenciados aqui.
      const result = await extractPdfText(bytes, {
        onProgress: onExtractionProgress,
        signal: controller.signal,
      });

      if (isLikelyImageOnlyPdf(result.avgNonWhitespacePerPage, env.pdfMinCharsPerPage)) {
        onExtractionFailed();
        setProblem({ title: 'PDF sem texto selecionável', message: IMAGE_ONLY_MESSAGE, suggestPaste: true });
        return;
      }

      onExtracted(result.text, {
        fileName: file.name,
        sizeBytes: file.size,
        pageCount: result.pageCount,
        charCount: result.text.length,
      });
    } catch (error) {
      onExtractionFailed();
      const kind = error instanceof PdfExtractionError ? error.kind : 'unknown';
      setProblem(EXTRACTION_PROBLEMS[kind]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy || extraction) return;
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function cancelExtraction() {
    abortRef.current?.abort();
  }

  const showPreview = meta && !extraction && !replacing;

  return (
    <div className="space-y-4">
      {showPreview ? (
        <ExtractedPreview
          text={text}
          meta={meta}
          disabled={busy}
          onEdit={onEditText}
          onReplace={() => {
            setReplacing(true);
            inputRef.current?.click();
          }}
        />
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cx(
            'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center',
            dragging ? 'border-primary bg-sev-baixa-bg' : 'border-line-strong bg-surface-muted',
          )}
        >
          <FileUp aria-hidden="true" className="size-8 text-fg-muted" />
          {extraction ? (
            <ExtractionStatus progress={extraction} onCancel={cancelExtraction} />
          ) : (
            <>
              <p className="font-medium">Arraste o PDF do CNIS para cá</p>
              <p id={hintId} className="text-sm text-fg-muted">
                ou use o botão abaixo. PDF de até {formatNumber(env.maxPdfMb)} MB. O arquivo é lido aqui no
                navegador e nunca é enviado ao servidor.
              </p>
              <Button
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                aria-describedby={hintId}
              >
                Escolher arquivo
              </Button>
              {replacing && meta ? (
                <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                  Manter o arquivo atual
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          else setReplacing(false);
        }}
      />

      {problem ? (
        <Alert
          tone="error"
          title={problem.title}
          actions={
            problem.suggestPaste ? (
              <Button variant="secondary" size="sm" onClick={onGoToTextTab}>
                Colar o texto manualmente
              </Button>
            ) : undefined
          }
        >
          <p>{problem.message}</p>
        </Alert>
      ) : null}
    </div>
  );
}

function ExtractionStatus({ progress, onCancel }: { progress: ExtractionProgress; onCancel: () => void }) {
  const percent = progress.total > 0 ? Math.round((progress.page / progress.total) * 100) : 0;
  return (
    <div className="w-full max-w-sm space-y-2">
      <p className="font-medium">
        Extraindo página {formatNumber(progress.page)} de {formatNumber(progress.total)}
      </p>
      <progress
        className="h-2 w-full accent-primary"
        max={100}
        value={percent}
        aria-label="Progresso da extração do PDF"
      />
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancelar leitura
      </Button>
    </div>
  );
}
