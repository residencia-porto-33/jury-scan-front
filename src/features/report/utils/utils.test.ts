import { describe, expect, it } from 'vitest';

import cnisText from '../../../mocks/fixtures/cnis-ficticio.txt?raw';
import { analiseCompleta } from '../../../mocks/fixtures/responses';
import { normalizeAnalysis } from '../../analysis/adapters/normalizeAnalysis';
import { EMPTY_FILTER, filterIssues, isFilterActive, listCategories, toggleSeveridade } from './filters';
import { formatConfianca } from './labels';
import { maskDocumentNumber, maskPersonalNumbers } from './mask';

describe('mask', () => {
  it('mascara CPF deixando só o terceiro grupo', () => {
    expect(maskDocumentNumber('123.456.789-00')).toBe('***.***.789-**');
    expect(maskDocumentNumber('12345678900')).toBe('******789**');
  });

  it('mascara NIT mantendo o tamanho', () => {
    const masked = maskDocumentNumber('123.45678.90-0');
    expect(masked).toHaveLength('123.45678.90-0'.length);
    expect(masked.replace(/[^0-9]/g, '')).toHaveLength(3);
  });

  it('mascara CPFs e NITs em texto livre sem mudar o tamanho', () => {
    const masked = maskPersonalNumbers(cnisText);
    expect(masked).toHaveLength(cnisText.length);
    expect(masked).not.toContain('123.456.789-00');
    expect(masked).not.toContain('123.45678.90-0');
    // CNPJ e competências não são dados pessoais e ficam intactos.
    expect(masked).toContain('11.111.111/0001-11');
    expect(masked).toContain('03/2010');
  });
});

describe('filters', () => {
  const { issues } = normalizeAnalysis(analiseCompleta, cnisText);

  it('sem filtro devolve todos na mesma ordem', () => {
    expect(filterIssues(issues, EMPTY_FILTER)).toEqual(issues);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it('filtra por uma ou mais severidades', () => {
    const alta = toggleSeveridade(EMPTY_FILTER, 'alta');
    expect(filterIssues(issues, alta).map((i) => i.identificador)).toEqual(['CNIS-001', 'CNIS-002']);
    const altaEInfo = toggleSeveridade(alta, 'info');
    expect(filterIssues(issues, altaEInfo)).toHaveLength(3);
    expect(toggleSeveridade(altaEInfo, 'alta').severidades).toEqual(new Set(['info']));
    expect(isFilterActive(alta)).toBe(true);
  });

  it('filtra por categoria e combina com severidade', () => {
    const filter = { severidades: new Set(['media'] as const), categoria: 'Remuneração extemporânea' };
    expect(filterIssues(issues, filter).map((i) => i.identificador)).toEqual(['CNIS-003']);
  });

  it('lista categorias únicas em ordem alfabética', () => {
    const categories = listCategories(issues);
    expect(categories).toHaveLength(6);
    expect([...categories].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(categories);
  });
});

describe('formatConfianca', () => {
  it('formata em porcentagem inteira', () => {
    expect(formatConfianca(0.824)).toBe('82%');
    expect(formatConfianca(1)).toBe('100%');
    expect(formatConfianca(0)).toBe('0%');
  });
});
