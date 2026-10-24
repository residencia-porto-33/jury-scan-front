/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_MIN_INPUT_CHARS?: string;
  readonly VITE_MAX_INPUT_CHARS?: string;
  readonly VITE_MAX_PDF_MB?: string;
  readonly VITE_PDF_MIN_CHARS_PER_PAGE?: string;
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
