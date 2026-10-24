import { describe, expect, it } from 'vitest';

import cnisText from '../../mocks/fixtures/cnis-ficticio.txt?raw';
import { findCnisMarkers, looksLikeCnis } from './cnisHeuristics';

describe('cnisHeuristics', () => {
  it('reconhece o CNIS fictício', () => {
    expect(findCnisMarkers(cnisText)).toEqual([
      'CNIS',
      'Cadastro Nacional de Informações Sociais',
      'NIT',
      'Relações Previdenciárias',
      'Remunerações',
    ]);
    expect(looksLikeCnis(cnisText)).toBe(true);
  });

  it('ignora acentos e caixa', () => {
    expect(looksLikeCnis('RELACOES PREVIDENCIARIAS do segurado')).toBe(true);
    expect(looksLikeCnis('remunerações')).toBe(true);
  });

  it('não confunde palavras que contêm "nit"', () => {
    expect(looksLikeCnis('Unidade de saúde: unitário, infinito, nitidez')).toBe(false);
  });

  it('não reconhece um contrato de aluguel', () => {
    expect(looksLikeCnis('CONTRATO DE LOCAÇÃO RESIDENCIAL. O locador cede ao locatário o imóvel...')).toBe(
      false,
    );
  });
});
