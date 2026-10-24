import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import cnisText from '../../../mocks/fixtures/cnis-ficticio.txt?raw';
import {
  analiseCompleta,
  analiseEvidenciaInexistente,
  analiseIssueSemEvidencia,
  analiseNaoCnis,
  analiseResumoNulo,
  analiseSemAchados,
} from '../../../mocks/fixtures/responses';
import { normalizeAnalysis } from '../../analysis/adapters/normalizeAnalysis';
import { ReportView } from './ReportView';

function renderReport(raw: unknown, text = cnisText) {
  const onNewAnalysis = vi.fn();
  const utils = render(
    <ReportView
      result={normalizeAnalysis(raw, text)}
      sentText={text}
      titleRef={createRef()}
      onNewAnalysis={onNewAnalysis}
    />,
  );
  return { ...utils, onNewAnalysis, user: userEvent.setup() };
}

describe('ReportView — relatório completo', () => {
  it('mostra risco, resumo, ações e achados na ordem de severidade', () => {
    renderReport(analiseCompleta);

    expect(screen.getByText('Risco agregado: Alto')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ações prioritárias' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('heading', { name: 'Ações prioritárias' }).parentElement!).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(4);

    const cards = screen.getAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      expect.stringContaining('CNIS-001'),
      expect.stringContaining('CNIS-002'),
      expect.stringContaining('CNIS-004'),
      expect.stringContaining('CNIS-003'),
      expect.stringContaining('CNIS-005'),
      expect.stringContaining('CNIS-006'),
    ]);
  });

  it('cada achado mostra severidade com texto, evidência, confiança e aviso fixo', () => {
    renderReport(analiseCompleta);
    const card = screen.getAllByRole('article')[0]!;
    expect(within(card).getByText('Severidade alta')).toBeInTheDocument();
    expect(within(card).getByText('COMERCIO FICTICIO BETA SA Empregado 01/02/2002')).toBeInTheDocument();
    expect(within(card).getByText('Confiança da IA:')).toHaveTextContent('Confiança da IA: 91%');
    expect(within(card).getByText('Indica a confiança do modelo, não certeza jurídica.')).toBeInTheDocument();
  });

  it('contadores funcionam como filtros com aria-pressed', async () => {
    const { user } = renderReport(analiseCompleta);
    const alta = screen.getByRole('button', { name: /^Alta 2$/ });
    expect(alta).toHaveAttribute('aria-pressed', 'false');

    await user.click(alta);
    expect(alta).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Mostrando 2 de 6 achados.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Todos 6$/ }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('filtra por categoria e permite limpar quando nada sobra', async () => {
    const { user } = renderReport(analiseCompleta);
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Remuneração extemporânea');
    expect(screen.getAllByRole('article')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^Alta 2$/ }));
    expect(screen.getByText('Nenhum achado com os filtros selecionados.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('marca achados como conferidos e mostra o progresso', async () => {
    const { user } = renderReport(analiseCompleta);
    expect(screen.getByText('0 de 6')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Conferido (CNIS-001)' }));
    await user.click(screen.getByRole('checkbox', { name: 'Conferido (CNIS-003)' }));
    expect(screen.getByText('2 de 6')).toBeInTheDocument();
  });

  it('"Ver no documento" abre o texto enviado com o trecho em <mark> e permite voltar', async () => {
    const { user } = renderReport(analiseCompleta);
    const trigger = screen.getByRole('button', { name: 'Ver no documento (evidência CNIS-003)' });
    await user.click(trigger);

    const region = screen.getByRole('region', { name: 'Texto enviado, com a evidência destacada' });
    const mark = region.querySelector('mark');
    expect(mark?.textContent?.replace(/\s+/g, ' ')).toBe('03/2010 PREM-EXT');

    await user.click(screen.getByRole('button', { name: 'Voltar ao achado CNIS-003' }));
    expect(trigger).toHaveFocus();
  });

  it('evidência não localizada recebe selo de alerta e não oferece "Ver no documento"', () => {
    renderReport(analiseEvidenciaInexistente);
    const card = screen.getAllByRole('article').find((a) => a.textContent?.includes('CNIS-002'))!;
    expect(within(card).getByText(/Trecho não encontrado literalmente/)).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Ver no documento/ })).not.toBeInTheDocument();
  });

  it('"Ocultar dados pessoais" mascara CPF/NIT no resumo e nas evidências', async () => {
    const { user } = renderReport(analiseCompleta);
    await user.click(screen.getByRole('button', { name: 'Ocultar dados pessoais' }));
    expect(screen.getByRole('button', { name: 'Mostrar dados pessoais' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByText('123.456.789-00')).not.toBeInTheDocument();
    expect(screen.getByText('***.***.789-**')).toBeInTheDocument();
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = renderReport(analiseCompleta);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ReportView — variações', () => {
  it('campos ausentes aparecem como "Não identificado"', () => {
    renderReport(analiseResumoNulo);
    expect(screen.getAllByText('Não identificado')).toHaveLength(5);
  });

  it('estado vazio explícito quando não há achados', () => {
    renderReport(analiseSemAchados);
    expect(
      screen.getByText('Nenhuma inconsistência identificada pela triagem automática'),
    ).toBeInTheDocument();
    expect(screen.getByText('Isso não dispensa a revisão profissional.')).toBeInTheDocument();
  });

  it('avisa quantos achados foram descartados por falta de evidência', () => {
    renderReport(analiseIssueSemEvidencia);
    expect(
      screen.getByText('2 achados foram descartados por não apresentarem evidência.'),
    ).toBeInTheDocument();
  });

  it('documento não-CNIS troca o relatório pelo aviso de pendência, sem risco nem achados', async () => {
    const text = 'CONTRATO DE LOCAÇÃO RESIDENCIAL\nO locador cede o imóvel ao locatário.';
    const { onNewAnalysis, user, container } = renderReport(analiseNaoCnis(text), text);

    expect(screen.getByRole('heading', { name: 'Documento não reconhecido como CNIS' })).toBeInTheDocument();
    expect(screen.getByText('nenhuma conclusão previdenciária foi feita')).toBeInTheDocument();
    expect(screen.queryByText(/Risco agregado/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Enviar outro documento' }));
    expect(onNewAnalysis).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });
});
