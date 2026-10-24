/** Valores do enum `origem` do contrato (`AnalysisRequestBody.origem` no openapi.yaml). */
export type Origem = 'texto_colado' | 'upload_pdf';

/** Metadados do PDF lido localmente. O arquivo em si nunca sai do navegador. */
export interface PdfMeta {
  fileName: string;
  sizeBytes: number;
  pageCount: number;
  charCount: number;
}

export interface ExtractionProgress {
  page: number;
  total: number;
}
