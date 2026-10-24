import { describe, expect, it } from 'vitest';

import { createEvidenceLocator } from './locateEvidence';

describe('createEvidenceLocator', () => {
  const text = 'Linha 1\n03/2010      PREM-EXT\nCOMERCIO   Fictício\tBETA';
  const locate = createEvidenceLocator(text);

  it('encontra ignorando espaços, quebras e caixa e devolve a posição original', () => {
    const range = locate('03/2010 prem-ext');
    expect(range).toBeDefined();
    expect(text.slice(range!.start, range!.end)).toBe('03/2010      PREM-EXT');
  });

  it('atravessa quebras de linha e tabs', () => {
    const range = locate('PREM-EXT COMERCIO fictício BETA');
    expect(text.slice(range!.start, range!.end)).toBe('PREM-EXT\nCOMERCIO   Fictício\tBETA');
  });

  it('remove aspas em volta da evidência', () => {
    expect(locate('“Linha 1”')).toEqual({ start: 0, end: 7 });
  });

  it('não encontra trecho inexistente ou vazio', () => {
    expect(locate('EMPRESA INEXISTENTE')).toBeUndefined();
    expect(locate('   ')).toBeUndefined();
  });
});
