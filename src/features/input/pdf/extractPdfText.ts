import type { TextItem } from 'pdfjs-dist/types/src/display/api';

import type { ExtractionProgress } from '../types';
import { buildLines } from './buildLines';
import { loadPdfjs } from './pdfjs';

export type PdfExtractionErrorKind = 'password' | 'corrupted' | 'cancelled' | 'unknown';

export class PdfExtractionError extends Error {
  readonly kind: PdfExtractionErrorKind;

  constructor(kind: PdfExtractionErrorKind) {
    super(`Falha na extração do PDF: ${kind}`);
    this.name = 'PdfExtractionError';
    this.kind = kind;
  }
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  /** Média de caracteres não-brancos por página — base da detecção de PDF escaneado. */
  avgNonWhitespacePerPage: number;
}

interface ExtractOptions {
  onProgress?: (progress: ExtractionProgress) => void;
  signal?: AbortSignal;
}

/**
 * Extrai o texto de um PDF inteiramente no navegador.
 * Os bytes recebidos não são enviados a lugar nenhum e o documento é destruído ao final.
 */
export async function extractPdfText(
  data: Uint8Array,
  { onProgress, signal }: ExtractOptions = {},
): Promise<PdfExtractionResult> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: false,
  });

  const abort = () => void loadingTask.destroy();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const pdf = await loadingTask.promise;
    const total = pdf.numPages;
    const pages: string[] = [];
    let nonWhitespace = 0;

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      throwIfAborted(signal);
      onProgress?.({ page: pageNumber, total });
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is TextItem => 'str' in item);
      const pageText = buildLines(items);
      nonWhitespace += pageText.replace(/\s/g, '').length;
      pages.push(pageText);
      page.cleanup();
    }

    return {
      text: pages.join('\n\n').trim(),
      pageCount: total,
      avgNonWhitespacePerPage: total > 0 ? nonWhitespace / total : 0,
    };
  } catch (error) {
    throw toExtractionError(error, signal);
  } finally {
    signal?.removeEventListener('abort', abort);
    await loadingTask.destroy().catch(() => undefined);
  }
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new PdfExtractionError('cancelled');
}

function toExtractionError(error: unknown, signal: AbortSignal | undefined): PdfExtractionError {
  if (error instanceof PdfExtractionError) return error;
  if (signal?.aborted) return new PdfExtractionError('cancelled');
  const name = error instanceof Error ? error.name : '';
  if (name === 'PasswordException') return new PdfExtractionError('password');
  if (name === 'InvalidPDFException' || name === 'FormatError') return new PdfExtractionError('corrupted');
  return new PdfExtractionError('unknown');
}
