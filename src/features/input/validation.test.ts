import { describe, expect, it } from 'vitest';

import { hasPdfMagicBytes, isLikelyImageOnlyPdf, validatePdfFile, validateText } from './validation';

const limits = { minChars: 10, maxChars: 30 };

describe('validateText', () => {
  it.each([
    ['', 'empty'],
    ['   \n\t  ', 'empty'],
    ['curto', 'too_short'],
    ['   curto      ', 'too_short'],
    ['x'.repeat(31), 'too_long'],
  ])('rejeita %j como %s', (text, reason) => {
    const result = validateText(text, limits);
    expect(result).toMatchObject({ ok: false, reason });
  });

  it('aceita texto dentro dos limites', () => {
    expect(validateText('texto suficiente', limits)).toEqual({ ok: true });
  });

  it('usa números formatados em pt-BR na mensagem', () => {
    const result = validateText('x'.repeat(1500), { minChars: 10, maxChars: 1000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('1.500');
  });
});

describe('validatePdfFile', () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size });

  it('aceita PDF com MIME correto', () => {
    expect(validatePdfFile(file('cnis.pdf', 'application/pdf'), 20)).toEqual({ ok: true });
  });

  it('aceita extensão em maiúsculas e MIME vazio', () => {
    expect(validatePdfFile(file('CNIS.PDF', ''), 20)).toEqual({ ok: true });
  });

  it.each([
    [file('cnis.png', 'image/png'), 'not_pdf'],
    [file('cnis.pdf', 'image/png'), 'not_pdf'],
    [file('cnis.txt', 'application/pdf'), 'not_pdf'],
    [file('cnis.pdf', 'application/pdf', 0), 'empty_file'],
    [file('cnis.pdf', 'application/pdf', 21 * 1024 * 1024), 'too_large'],
  ])('rejeita %o (%s)', (input, reason) => {
    expect(validatePdfFile(input, 20)).toMatchObject({ ok: false, reason });
  });
});

describe('hasPdfMagicBytes', () => {
  it('reconhece a assinatura %PDF-', () => {
    expect(hasPdfMagicBytes(new TextEncoder().encode('%PDF-1.7 ...'))).toBe(true);
  });

  it.each(['PK\u0003\u0004', '%PD', '', ' %PDF-'])('rejeita %j', (content) => {
    expect(hasPdfMagicBytes(new TextEncoder().encode(content))).toBe(false);
  });
});

describe('isLikelyImageOnlyPdf', () => {
  it('compara com o limiar', () => {
    expect(isLikelyImageOnlyPdf(10, 50)).toBe(true);
    expect(isLikelyImageOnlyPdf(50, 50)).toBe(false);
  });
});
