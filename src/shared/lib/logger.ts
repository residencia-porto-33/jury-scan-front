/**
 * Único ponto autorizado a usar `console`.
 *
 * LGPD: aceita apenas metadados (números, booleanos e rótulos curtos de status),
 * nunca texto do documento, evidências ou dados pessoais. Em produção é no-op.
 */
export type LogMeta = Readonly<Record<string, number | boolean | null | undefined>>;

const enabled = import.meta.env.DEV && import.meta.env.MODE !== 'test';

export const logger = {
  /** `event` deve ser um identificador fixo do código (ex.: "severity_totals_mismatch"). */
  warn(event: string, meta?: LogMeta): void {
    if (!enabled) return;
    console.warn(`[juryscan] ${event}`, meta ?? {});
  },
  info(event: string, meta?: LogMeta): void {
    if (!enabled) return;
    console.info(`[juryscan] ${event}`, meta ?? {});
  },
};
