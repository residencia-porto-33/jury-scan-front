import type * as Pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

type PdfjsModule = typeof Pdfjs;

let pdfjsPromise: Promise<PdfjsModule> | undefined;

/**
 * Carrega o pdf.js sob demanda (fora do bundle inicial) e configura o worker
 * servido pela própria origem — nada de CDN.
 *
 * Usa o build `legacy`: o build padrão do pdf.js 6 depende de APIs muito recentes
 * (ex.: `Uint8Array.prototype.toHex`) e quebra em navegadores com poucos meses de atraso.
 */
export function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}
