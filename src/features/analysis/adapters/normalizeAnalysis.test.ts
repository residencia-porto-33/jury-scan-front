import { describe, expect, it, vi } from 'vitest';

import cnisText from '../../../mocks/fixtures/cnis-ficticio.txt?raw';
import {
  analiseCompleta,
  analiseConfiancaPercentual,
  analiseEvidenciaInexistente,
  analiseIssueSemEvidencia,
  analiseNaoCnis,
  analiseResumoNulo,
  analiseSemAchados,
  analiseSeveridadeComAcento,
  analiseTotaisDivergentes,
} from '../../../mocks/fixtures/responses';
import { logger } from '../../../shared/lib/logger';
import { InvalidResponseError } from '../api/errors';
import type { NormalizedAnalysis } from '../types';
import { normalizeAnalysis } from './normalizeAnalysis';

function expectConsistentTotals(result: NormalizedAnalysis) {
  const { alta, media, baixa, info, total } = result.totals;
  expect(alta + media + baixa + info).toBe(total);
  expect(total).toBe(result.issues.length);
  for (const sev of ['alta', 'media', 'baixa', 'info'] as const) {
    expect(result.totals[sev]).toBe(result.issues.filter((issue) => issue.severidade === sev).length);
  }
}

describe('normalizeAnalysis — caso completo', () => {
  const result = normalizeAnalysis(analiseCompleta, cnisText);

  it('normaliza resumo, risco, ações e metadados', () => {
    expect(result.summary).toEqual({
      cpf: '123.456.789-00',
      nitPisPasep: '123.45678.90-0',
      periodo: '03/1995 a 06/2014',
      vinculos: expect.arrayContaining(['EMPRESA FICTICIA ALFA LTDA — 01/03/1995 a 31/12/2001']),
      contextoBeneficio: expect.any(String),
    });
    expect(result.risco).toBe('alto');
    expect(result.acoesPrioritarias).toHaveLength(4);
    expect(result.discardedCount).toBe(0);
    expect(result.documentPending).toBe(false);
    expect(result.meta.analysisRequestId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('ordena por severidade, depois confiança desc, depois identificador', () => {
    expect(result.issues.map((i) => [i.severidade, i.identificador])).toEqual([
      ['alta', 'CNIS-001'],
      ['alta', 'CNIS-002'],
      ['media', 'CNIS-004'], // 0.80 antes de 0.77
      ['media', 'CNIS-003'],
      ['baixa', 'CNIS-005'],
      ['info', 'CNIS-006'],
    ]);
  });

  it('desempata pelo identificador quando severidade e confiança são iguais', () => {
    const [a, b] = analiseCompleta.issues;
    const tied = normalizeAnalysis(
      {
        ...analiseCompleta,
        issues: [
          { ...b!, identificador_exibicao: 'CNIS-010', confianca: 0.5, severidade: 'alta' },
          { ...a!, identificador_exibicao: 'CNIS-002', confianca: 0.5 },
        ],
      },
      cnisText,
    );
    expect(tied.issues.map((i) => i.identificador)).toEqual(['CNIS-002', 'CNIS-010']);
  });

  it('localiza todas as evidências no texto enviado, ignorando espaços e caixa', () => {
    for (const issue of result.issues) {
      expect(issue.evidenciaLocalizada, issue.identificador).toBe(true);
      const range = issue.evidenciaRange!;
      const original = cnisText.slice(range.start, range.end);
      expect(original.replace(/\s+/g, ' ').toLowerCase()).toBe(
        issue.evidencia.replace(/\s+/g, ' ').toLowerCase(),
      );
    }
  });

  it('mantém totais coerentes', () => {
    expectConsistentTotals(result);
    expect(result.totals).toEqual({ alta: 2, media: 2, baixa: 1, info: 1, total: 6 });
  });
});

describe('normalizeAnalysis — variações', () => {
  it('análise sem achados', () => {
    const result = normalizeAnalysis(analiseSemAchados, cnisText);
    expect(result.issues).toEqual([]);
    expect(result.totals).toEqual({ alta: 0, media: 0, baixa: 0, info: 0, total: 0 });
    expect(result.risco).toBe('baixo');
  });

  it('documento que não é CNIS vira pendência documental', () => {
    const text = 'CONTRATO DE LOCAÇÃO RESIDENCIAL\nO locador cede o imóvel...';
    const result = normalizeAnalysis(analiseNaoCnis(text), text);
    expect(result.documentPending).toBe(true);
    expect(result.summary.cpf).toBeUndefined();
    expect(result.summary.nitPisPasep).toBeUndefined();
  });

  it('descarta e conta issues sem evidência', () => {
    const result = normalizeAnalysis(analiseIssueSemEvidencia, cnisText);
    expect(result.issues.map((i) => i.identificador)).toEqual(['CNIS-001']);
    expect(result.discardedCount).toBe(2);
    expectConsistentTotals(result);
  });

  it('descarta issue com evidência ausente (null)', () => {
    const [first] = analiseCompleta.issues;
    const result = normalizeAnalysis(
      { ...analiseCompleta, issues: [{ ...first, evidencia: null }] },
      cnisText,
    );
    expect(result.issues).toHaveLength(0);
    expect(result.discardedCount).toBe(1);
  });

  it('recalcula totais divergentes e avisa só com números', () => {
    const warn = vi.spyOn(logger, 'warn');
    const result = normalizeAnalysis(analiseTotaisDivergentes, cnisText);
    expect(result.totals).toEqual({ alta: 2, media: 2, baixa: 1, info: 1, total: 6 });
    expectConsistentTotals(result);
    expect(warn).toHaveBeenCalledOnce();
    const [, meta] = warn.mock.calls[0]!;
    expect(Object.values(meta ?? {}).every((value) => typeof value === 'number' || value === null)).toBe(
      true,
    );
  });

  it('não avisa quando os totais batem', () => {
    const warn = vi.spyOn(logger, 'warn');
    normalizeAnalysis(analiseCompleta, cnisText);
    expect(warn).not.toHaveBeenCalled();
  });

  it('aceita severidade e risco com acento e maiúsculas', () => {
    const result = normalizeAnalysis(analiseSeveridadeComAcento, cnisText);
    expect(result.issues.map((i) => i.severidade)).toEqual(['alta', 'media', 'media']);
    expect(result.risco).toBe('medio');
  });

  it('converte confiança 0–100 e faz clamp em [0,1]', () => {
    const result = normalizeAnalysis(analiseConfiancaPercentual, cnisText);
    const byId = Object.fromEntries(result.issues.map((i) => [i.identificador, i.confianca]));
    expect(byId).toEqual({ 'CNIS-001': 0.82, 'CNIS-002': 1, 'CNIS-003': 0 });
  });

  it('campos ausentes do resumo viram undefined (nunca inventa valor)', () => {
    const result = normalizeAnalysis(analiseResumoNulo, cnisText);
    expect(result.summary).toEqual({
      cpf: undefined,
      nitPisPasep: undefined,
      periodo: undefined,
      vinculos: [],
      contextoBeneficio: undefined,
    });
  });

  it('converte vínculos em objeto para texto', () => {
    const result = normalizeAnalysis(
      {
        ...analiseCompleta,
        document_summary: {
          ...analiseCompleta.document_summary,
          vinculos: [{ empregador: 'EMPRESA X', inicio: '01/2000', fim: null }, 'N/A'],
        },
      },
      cnisText,
    );
    expect(result.summary.vinculos).toEqual(['EMPRESA X · 01/2000']);
  });

  it('marca evidência que não existe no texto', () => {
    const result = normalizeAnalysis(analiseEvidenciaInexistente, cnisText);
    const missing = result.issues.find((i) => i.identificador === 'CNIS-002')!;
    expect(missing.evidenciaLocalizada).toBe(false);
    expect(missing.evidenciaRange).toBeUndefined();
    expect(result.issues.find((i) => i.identificador === 'CNIS-001')!.evidenciaLocalizada).toBe(true);
  });

  it('descricao e impacto são opcionais (como no openapi.yaml)', () => {
    const [first] = analiseCompleta.issues;
    const { descricao: _d, impacto: _i, ...rest } = first!;
    const result = normalizeAnalysis({ ...analiseCompleta, issues: [rest] }, cnisText);
    expect(result.issues[0]).toMatchObject({ descricao: undefined, impacto: undefined });
  });
});

describe('normalizeAnalysis — respostas fora do contrato', () => {
  const [first] = analiseCompleta.issues;

  it.each([
    ['corpo nulo', null],
    ['corpo em lista', []],
    ['sem issues', { ...analiseCompleta, issues: undefined }],
    ['issues não é lista', { ...analiseCompleta, issues: 'x' }],
    ['sem document_summary', { ...analiseCompleta, document_summary: undefined }],
    ['sem risco', { ...analiseCompleta, risco_agregado: undefined }],
    ['risco desconhecido', { ...analiseCompleta, risco_agregado: 'altíssimo' }],
    ['sem ações', { ...analiseCompleta, acoes_prioritarias: undefined }],
    ['severidade desconhecida', { ...analiseCompleta, issues: [{ ...first, severidade: 'crítica' }] }],
    ['confiança não numérica', { ...analiseCompleta, issues: [{ ...first, confianca: 'alta' }] }],
    ['sem identificador', { ...analiseCompleta, issues: [{ ...first, identificador_exibicao: '' }] }],
    ['sem categoria', { ...analiseCompleta, issues: [{ ...first, categoria: undefined }] }],
    ['sem sugestão', { ...analiseCompleta, issues: [{ ...first, sugestao: 42 }] }],
    ['issue não é objeto', { ...analiseCompleta, issues: ['texto'] }],
  ])('%s → InvalidResponseError', (_label, raw) => {
    expect(() => normalizeAnalysis(raw, cnisText)).toThrow(InvalidResponseError);
  });

  it('a mensagem do erro não carrega conteúdo do documento', () => {
    try {
      normalizeAnalysis({ ...analiseCompleta, issues: [{ ...first, severidade: 'crítica' }] }, cnisText);
    } catch (error) {
      expect((error as Error).message).not.toContain('COMERCIO');
      expect((error as Error).message).not.toContain('crítica');
    }
  });
});
