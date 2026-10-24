import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extractPdfText } from '../features/input/pdf/extractPdfText';
import cnisText from '../mocks/fixtures/cnis-ficticio.txt?raw';
import { analiseCompleta } from '../mocks/fixtures/responses';
import { liveRegion, mockAnalyzeSequence, pasteAndAnalyze, respondJson } from '../test/helpers';
import { App } from './App';

vi.mock('../features/input/pdf/extractPdfText', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/input/pdf/extractPdfText')>();
  return { ...original, extractPdfText: vi.fn() };
});

const extractMock = vi.mocked(extractPdfText);

beforeEach(() => {
  extractMock.mockReset();
});

describe('Fluxo completo', () => {
  it('colar → analisar → relatório, com foco no título e anúncio no aria-live', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);

    await pasteAndAnalyze(user, cnisText);

    const title = await screen.findByRole('heading', { name: 'Relatório da triagem' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(bodies).toEqual([{ texto_input: cnisText, origem: 'texto_colado' }]);
    expect(liveRegion()).toHaveTextContent('Análise concluída: 6 achados, risco alto.');
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('note', { name: 'Aviso de revisão humana obrigatória' })).toHaveTextContent(
      'Revisão humana obrigatória.',
    );
    expect(screen.getByText(/texto colado ·/)).toBeInTheDocument();
  });

  it('upload → prévia → analisar envia origem upload_pdf (e nunca o arquivo)', async () => {
    extractMock.mockResolvedValue({ text: cnisText, pageCount: 2, avgNonWhitespacePerPage: 600 });
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Enviar PDF' }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['%PDF-1.7 fictício'], 'cnis-maria.pdf', { type: 'application/pdf' }));

    expect(
      await screen.findByRole('region', { name: 'Prévia do texto extraído do PDF' }),
    ).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('PDF lido: 2 páginas');
    await user.click(screen.getByRole('button', { name: 'Analisar' }));

    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    expect(bodies).toEqual([{ texto_input: cnisText, origem: 'upload_pdf' }]);
    expect(Object.keys(bodies[0]!)).toEqual(['texto_input', 'origem']);
    expect(screen.getByText('cnis-maria.pdf')).toBeInTheDocument();
  });

  it('mostra "Processando" com Cancelar e bloqueia duplo envio', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(async () => {
      await delay('infinite');
      return HttpResponse.json(analiseCompleta);
    });
    render(<App />);

    await pasteAndAnalyze(user, cnisText);
    expect(await screen.findByText('Analisando o documento.')).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent('Analisando documento.');

    const analyze = screen.getByRole('button', { name: 'Analisar' });
    expect(analyze).toHaveAttribute('aria-disabled', 'true');
    await user.dblClick(analyze);
    expect(bodies).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    const title = await screen.findByRole('heading', { name: /Análise cancelada/ });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('"Tentar novamente" reenvia exatamente o mesmo texto', async () => {
    const user = userEvent.setup();
    const bodies = mockAnalyzeSequence(respondJson({ detail: 'falha' }, 502), respondJson(analiseCompleta));
    render(<App />);

    await pasteAndAnalyze(user, cnisText);
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
  });

  it('"Nova análise" limpa texto, resultado e marcações de conferido', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);

    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    await user.click(screen.getByRole('checkbox', { name: 'Conferido (CNIS-001)' }));
    expect(screen.getByText('1 de 6')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova análise' }));

    expect(screen.queryByRole('heading', { name: 'Relatório da triagem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Texto do extrato do CNIS')).toHaveValue('');
    expect(document.body.textContent).not.toContain('COMERCIO FICTICIO BETA SA');

    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    expect(screen.getByText('0 de 6')).toBeInTheDocument();
  });

  it('documento que não é CNIS mostra a pendência documental, com foco no título', async () => {
    const user = userEvent.setup();
    render(<App />);

    await pasteAndAnalyze(
      user,
      'CONTRATO DE LOCAÇÃO RESIDENCIAL. O locador cede o imóvel ao locatário. '.repeat(5),
    );

    const title = await screen.findByRole('heading', { name: 'Documento não reconhecido como CNIS' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(liveRegion()).toHaveTextContent('documento não reconhecido como CNIS');
    expect(screen.queryByText(/Risco agregado/)).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar outro documento' }));
    expect(screen.getByLabelText('Texto do extrato do CNIS')).toHaveValue('');
  });

  it('"Ver no documento" destaca a evidência no texto que foi enviado', async () => {
    const user = userEvent.setup();
    mockAnalyzeSequence(respondJson(analiseCompleta));
    render(<App />);

    await pasteAndAnalyze(user, cnisText);
    await screen.findByRole('heading', { name: 'Relatório da triagem' });
    await user.click(screen.getByRole('button', { name: 'Ver no documento (evidência CNIS-004)' }));

    const region = screen.getByRole('region', { name: 'Texto enviado, com a evidência destacada' });
    expect(within(region).getByText(/PREC-MENOR-MIN/, { selector: 'mark' })).toBeInTheDocument();
  });
});
