// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { extractPdfText, PdfExtractionError } from './extractPdfText';

// No Node o pdf.js roda com "fake worker": basta apontar para o arquivo do worker.
vi.mock('./pdfjs', () => ({
  loadPdfjs: async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const require = createRequire(import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
      require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ).href;
    return pdfjs;
  },
}));

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL(`../../../test/fixtures/${name}`, import.meta.url)));
}

describe('extractPdfText', () => {
  // A primeira carga transforma o worker (~2 MB) no Vitest; aquece antes dos testes.
  beforeAll(async () => {
    await extractPdfText(await fixture('cnis-imagem.pdf'));
  }, 60_000);

  it('extrai o texto preservando as linhas da tabela e reporta progresso', async () => {
    const progress: Array<{ page: number; total: number }> = [];
    const result = await extractPdfText(await fixture('cnis-texto.pdf'), {
      onProgress: (p) => progress.push(p),
    });

    expect(result.pageCount).toBe(2);
    expect(progress).toEqual([
      { page: 1, total: 2 },
      { page: 2, total: 2 },
    ]);
    expect(result.text).toContain('Cadastro Nacional de Informações Sociais');
    // Cada vínculo continua numa linha só, com as colunas na ordem visual.
    const vinculo = result.text.split('\n').find((line) => line.includes('COMERCIO FICTICIO BETA SA'));
    expect(vinculo).toMatch(
      /^2\s+123\.45678\.90-0\s+11\.111\.111\/0001-11\s+COMERCIO FICTICIO BETA SA\s+Empregado/,
    );
    expect(result.avgNonWhitespacePerPage).toBeGreaterThan(50);
  });

  it('PDF só com imagem tem média de caracteres próxima de zero', async () => {
    const result = await extractPdfText(await fixture('cnis-imagem.pdf'));
    expect(result.pageCount).toBe(2);
    expect(result.avgNonWhitespacePerPage).toBeLessThan(1);
  });

  it('PDF corrompido gera erro "corrupted"', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\nisto não é um PDF de verdade');
    await expect(extractPdfText(bytes)).rejects.toMatchObject({ kind: 'corrupted' });
  });

  it('cancelamento interrompe a extração', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await extractPdfText(await fixture('cnis-texto.pdf'), { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(PdfExtractionError);
    expect((error as PdfExtractionError).kind).toBe('cancelled');
  });
});
