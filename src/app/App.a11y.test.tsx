import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import cnisText from '../mocks/fixtures/cnis-ficticio.txt?raw';
import { analiseCompleta, analiseSemAchados } from '../mocks/fixtures/responses';
import { mockAnalyzeSequence, pasteAndAnalyze, pasteText, respondJson } from '../test/helpers';
import { App } from './App';

describe('Acessibilidade (axe) em cada estado', () => {
  it('idle', async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('texto pronto com aviso de "não parece CNIS"', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await pasteText(user, 'Um documento qualquer que não é extrato previdenciário. '.repeat(5));
    expect(screen.getByText('Não identificamos marcadores típicos de um CNIS')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('erro', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson({ detail: 'x' }, 502));
    const { container } = render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: /Análise indisponível/ });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('relatório (com filtro ativo e texto enviado aberto)', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson(analiseCompleta));
    const { container } = render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    await user.click(screen.getByRole('button', { name: /^Média 2$/ }));
    await user.click(screen.getByRole('button', { name: 'Ver no documento (evidência CNIS-003)' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('relatório sem achados', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson(analiseSemAchados));
    const { container } = render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByText('Nenhuma inconsistência identificada pela triagem automática');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('pendência documental', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await pasteAndAnalyze(user, 'Recibo de aluguel referente ao mês corrente, sem outros dados. '.repeat(5));
    await screen.findByRole('heading', { name: 'Documento não reconhecido como CNIS' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('hierarquia de headings e landmarks no relatório', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);
    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Relatório da triagem' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Achados da triagem' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(6);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('note'));
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
