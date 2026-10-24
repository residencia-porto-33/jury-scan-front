/**
 * Content-Security-Policy do JuryScan.
 *
 * Nenhum recurso de terceiros é carregado em runtime (LGPD): fontes, ícones e o
 * worker do pdf.js são servidos pela própria origem. A única conexão externa
 * permitida é a API (`connect-src`).
 */
export function buildCsp(apiBaseUrl: string): string {
  const apiOrigin = toOrigin(apiBaseUrl);

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

function toOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}
