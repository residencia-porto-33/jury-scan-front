/**
 * Respostas fictícias de POST /api/analyze. Todos os dados são inventados:
 * CPF e NIT não passam no dígito verificador.
 */
import type { RawAnalysisResponse, RawIssue } from '../../features/analysis/types';

export const analiseCompleta: RawAnalysisResponse = {
  analysis_request_id: '00000000-0000-4000-8000-000000000001',
  status: 'concluido',
  document_summary: {
    cpf: '123.456.789-00',
    nit_pis_pasep: '123.45678.90-0',
    periodo: '03/1995 a 06/2014',
    vinculos: [
      'EMPRESA FICTICIA ALFA LTDA — 01/03/1995 a 31/12/2001',
      'COMERCIO FICTICIO BETA SA — 01/02/2002 a (sem data fim)',
      'Contribuinte Individual — 01/01/2012 a 31/12/2015',
      'SERVICOS FICTICIOS GAMA EIRELI — 01/03/2010 a 30/06/2014',
    ],
    contexto_beneficio: 'Não informado; extrato compatível com levantamento de tempo de contribuição.',
  },
  issues: [
    {
      identificador_exibicao: 'CNIS-001',
      severidade: 'alta',
      categoria: 'Vínculo sem data de fim',
      descricao: 'O vínculo 2 não tem data de encerramento e a última remuneração é de 06/2010.',
      evidencia: 'COMERCIO FICTICIO BETA SA Empregado 01/02/2002',
      sugestao:
        'Solicitar CTPS, termo de rescisão ou declaração do empregador para comprovar a data de saída.',
      impacto: 'Sem a data fim, o período pode ser desconsiderado ou contado de forma incorreta.',
      confianca: 0.91,
    },
    {
      identificador_exibicao: 'CNIS-002',
      severidade: 'alta',
      categoria: 'Concomitância de vínculos',
      descricao: 'Os vínculos 2 e 4 se sobrepõem entre 03/2010 e 06/2010.',
      evidencia: 'SERVICOS FICTICIOS GAMA EIRELI Empregado 01/03/2010 30/06/2014',
      sugestao:
        'Conferir se houve de fato dois empregos simultâneos e como somar os salários de contribuição.',
      impacto: 'Período concomitante não conta em dobro como tempo de contribuição.',
      confianca: 0.84,
    },
    {
      identificador_exibicao: 'CNIS-003',
      severidade: 'media',
      categoria: 'Remuneração extemporânea',
      descricao: 'Competência 03/2010 com indicador PREM-EXT (remuneração informada fora do prazo).',
      evidencia: '03/2010 PREM-EXT',
      sugestao: 'Reunir holerites da competência para eventual comprovação.',
      impacto: 'Remuneração extemporânea pode ser desconsiderada até comprovação.',
      confianca: 0.77,
    },
    {
      identificador_exibicao: 'CNIS-004',
      severidade: 'media',
      categoria: 'Recolhimento abaixo do mínimo',
      descricao: 'Competência 03/2012 com contribuição zerada e indicador PREC-MENOR-MIN.',
      evidencia: '03/2012 0,00 0,00 PREC-MENOR-MIN',
      sugestao: 'Avaliar complementação da contribuição para que a competência seja computada.',
      impacto: 'Competência abaixo do mínimo não conta para tempo nem carência.',
      confianca: 0.8,
    },
    {
      identificador_exibicao: 'CNIS-005',
      severidade: 'baixa',
      categoria: 'Plano simplificado (LC 123)',
      descricao: 'Contribuições com indicador IREC-LC123 (alíquota reduzida).',
      evidencia: '01/2012 15/02/2012 62,20 311,00 IREC-LC123',
      sugestao:
        'Se o objetivo for aposentadoria por tempo de contribuição, avaliar complementação da alíquota.',
      impacto: 'No plano simplificado, a competência não conta para aposentadoria por tempo de contribuição.',
      confianca: 0.69,
    },
    {
      identificador_exibicao: 'CNIS-006',
      severidade: 'info',
      categoria: 'Vínculo regular',
      descricao: 'Vínculo 1 com início e fim registrados.',
      evidencia: 'EMPRESA FICTICIA ALFA LTDA Empregado 01/03/1995 31/12/2001',
      sugestao: 'Nenhuma ação necessária além da conferência de rotina.',
      impacto: 'Sem impacto identificado.',
      confianca: 0.95,
    },
  ],
  severity_totals: { alta: 2, media: 2, baixa: 1, info: 1 },
  risco_agregado: 'alto',
  acoes_prioritarias: [
    'Comprovar a data de saída do vínculo com COMERCIO FICTICIO BETA SA.',
    'Verificar a concomitância entre os vínculos 2 e 4 (03/2010 a 06/2010).',
    'Avaliar complementação da competência 03/2012.',
    'Avaliar complementação das contribuições no plano simplificado (IREC-LC123).',
  ],
};

export const analiseSemAchados: RawAnalysisResponse = {
  ...analiseCompleta,
  analysis_request_id: '00000000-0000-4000-8000-000000000002',
  issues: [],
  severity_totals: { alta: 0, media: 0, baixa: 0, info: 0 },
  risco_agregado: 'baixo',
  acoes_prioritarias: ['Seguir com a conferência manual de rotina do extrato.'],
};

/** Monta a pendência documental com uma evidência tirada do próprio texto enviado. */
export function analiseNaoCnis(sentText: string): RawAnalysisResponse {
  const firstLine = sentText.split(/\r?\n/).find((line) => line.trim().length > 0) ?? sentText;
  return {
    analysis_request_id: '00000000-0000-4000-8000-000000000003',
    status: 'concluido',
    document_summary: {
      cpf: 'não identificado',
      nit_pis_pasep: 'não identificado',
      periodo: null,
      vinculos: [],
      contexto_beneficio: null,
    },
    issues: [
      {
        identificador_exibicao: 'CNIS-001',
        severidade: 'info',
        categoria: 'pendencia_documental',
        descricao: 'O documento enviado não foi reconhecido como extrato do CNIS.',
        evidencia: firstLine.trim().slice(0, 120),
        sugestao: 'Enviar o extrato CNIS completo, baixado no Meu INSS.',
        impacto: 'Sem o CNIS não é possível fazer a triagem previdenciária.',
        confianca: 0.97,
      },
    ],
    severity_totals: { alta: 0, media: 0, baixa: 0, info: 1 },
    risco_agregado: 'baixo',
    acoes_prioritarias: ['Solicitar ao cliente o extrato CNIS completo (Meu INSS).'],
  };
}

// ---------------------------------------------------------------------------
// Variações para testar o adapter
// ---------------------------------------------------------------------------

function withIssues(issues: RawIssue[], extra: Partial<RawAnalysisResponse> = {}): RawAnalysisResponse {
  return { ...structuredClone(analiseCompleta), issues, ...extra };
}

const [issue1, issue2, issue3] = analiseCompleta.issues as [RawIssue, RawIssue, RawIssue, ...RawIssue[]];

export const analiseIssueSemEvidencia = withIssues([
  issue1,
  { ...issue2, evidencia: '' },
  { ...issue3, evidencia: '   ' },
]);

export const analiseTotaisDivergentes = withIssues(analiseCompleta.issues, {
  severity_totals: { alta: 5, media: 0, baixa: 0, info: 0 },
});

export const analiseSeveridadeComAcento = withIssues(
  [
    { ...issue1, severidade: 'Alta' },
    { ...issue2, severidade: 'média' },
    { ...issue3, severidade: 'MÉDIA' },
  ],
  { risco_agregado: 'Médio' },
);

export const analiseConfiancaPercentual = withIssues([
  { ...issue1, confianca: 82 },
  { ...issue2, confianca: 140 },
  { ...issue3, confianca: -0.2 },
]);

export const analiseResumoNulo = withIssues(analiseCompleta.issues, {
  document_summary: {
    cpf: null,
    nit_pis_pasep: 'Não identificado',
    periodo: 'N/A',
    vinculos: null,
    contexto_beneficio: '',
  },
});

export const analiseEvidenciaInexistente = withIssues([
  issue1,
  { ...issue2, evidencia: 'EMPRESA QUE NAO EXISTE NO EXTRATO 01/01/1990' },
]);
