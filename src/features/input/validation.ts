import { formatNumber } from '../../shared/lib/text';

export interface TextLimits {
  minChars: number;
  maxChars: number;
}

export type TextValidation =
  { ok: true } | { ok: false; reason: 'empty' | 'too_short' | 'too_long'; message: string };

export function validateText(text: string, limits: TextLimits): TextValidation {
  const length = text.trim().length;

  if (length === 0) {
    return { ok: false, reason: 'empty', message: 'Cole o texto do CNIS ou envie um PDF para começar.' };
  }
  if (length < limits.minChars) {
    return {
      ok: false,
      reason: 'too_short',
      message: `O texto tem ${formatNumber(length)} caracteres. O mínimo para análise é ${formatNumber(limits.minChars)}.`,
    };
  }
  if (text.length > limits.maxChars) {
    return {
      ok: false,
      reason: 'too_long',
      message: `O texto tem ${formatNumber(text.length)} caracteres e passa do limite de ${formatNumber(limits.maxChars)}. Remova trechos que não fazem parte do CNIS.`,
    };
  }
  return { ok: true };
}

export type PdfFileValidation =
  { ok: true } | { ok: false; reason: 'not_pdf' | 'too_large' | 'empty_file'; message: string };

const PDF_MIME = 'application/pdf';

/** Validação síncrona do arquivo escolhido (tipo, extensão e tamanho). Os magic bytes são checados depois. */
export function validatePdfFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  maxMb: number,
): PdfFileValidation {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  // Alguns sistemas não informam o MIME; nesse caso a extensão + magic bytes decidem.
  const mimeOk = file.type === '' || file.type === PDF_MIME;

  if (!hasPdfExtension || !mimeOk) {
    return { ok: false, reason: 'not_pdf', message: 'Este arquivo não é um PDF. Escolha um arquivo .pdf.' };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'empty_file', message: 'O arquivo está vazio.' };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return {
      ok: false,
      reason: 'too_large',
      message: `O arquivo passa do limite de ${formatNumber(maxMb)} MB.`,
    };
  }
  return { ok: true };
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

/** PDF só com imagem (escaneado): poucos caracteres visíveis por página. */
export function isLikelyImageOnlyPdf(avgNonWhitespacePerPage: number, threshold: number): boolean {
  return avgNonWhitespacePerPage < threshold;
}
