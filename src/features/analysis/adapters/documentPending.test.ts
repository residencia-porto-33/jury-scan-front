import { describe, expect, it } from 'vitest';

import { isDocumentPending } from './documentPending';

describe('isDocumentPending', () => {
  it.each([
    'pendencia_documental',
    'Pendência documental',
    'PENDÊNCIA-DOCUMENTAL',
    'documento_nao_reconhecido',
    'nao_e_cnis',
  ])('reconhece a categoria %j', (categoria) => {
    expect(isDocumentPending([{ categoria: 'Vínculo sem data fim' }, { categoria }])).toBe(true);
  });

  it.each(['Vínculo sem data fim', 'Documentação complementar necessária', 'Remuneração extemporânea'])(
    'não confunde achados comuns do CNIS (%j)',
    (categoria) => {
      expect(isDocumentPending([{ categoria }])).toBe(false);
    },
  );

  it('lista vazia não é pendência', () => {
    expect(isDocumentPending([])).toBe(false);
  });
});
