import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import cnisText from '../../../mocks/fixtures/cnis-ficticio.txt?raw';
import { extractPdfText, PdfExtractionError } from '../pdf/extractPdfText';
import type { ExtractionProgress, PdfMeta } from '../types';
import { InputPanel } from './InputPanel';

vi.mock('../pdf/extractPdfText', async (importOriginal) => {
  const original = await importOriginal<typeof import('../pdf/extractPdfText')>();
  return { ...original, extractPdfText: vi.fn() };
});

const extractMock = vi.mocked(extractPdfText);

function Harness({ onSubmit = () => undefined }: { onSubmit?: () => void }) {
  const [text, setText] = useState('');
  const [meta, setMeta] = useState<PdfMeta | undefined>();
  const [extraction, setExtraction] = useState<ExtractionProgress | undefined>();
  return (
    <InputPanel
      text={text}
      pdfMeta={meta}
      extraction={extraction}
      submitting={false}
      onTextChange={(value, _origem, newMeta) => {
        setText(value);
        setMeta(newMeta);
        setExtraction(undefined);
      }}
      onExtractionStart={() => setExtraction({ page: 0, total: 0 })}
      onExtractionProgress={setExtraction}
      onExtractionFailed={() => setExtraction(undefined)}
      onSubmit={onSubmit}
    />
  );
}

function pdfFile(content = '%PDF-1.7 conteúdo', name = 'cnis.pdf', type = 'application/pdf') {
  return new File([content], name, { type });
}

describe('InputPanel — texto colado', () => {
  it('mantém o botão Analisar desabilitado com o motivo visível e ligado por aria-describedby', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    const button = screen.getByRole('button', { name: /analisar/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Cole o texto do CNIS ou envie um PDF para começar.');

    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Texto do extrato do CNIS'), 'curto');
    expect(button).toHaveAccessibleDescription(/mínimo para análise é 200/);
  });

  it('desliga corretor ortográfico e autocompletar (LGPD)', () => {
    render(<Harness />);
    const textarea = screen.getByLabelText('Texto do extrato do CNIS');
    expect(textarea).toHaveAttribute('spellcheck', 'false');
    expect(textarea).toHaveAttribute('autocomplete', 'off');
    expect(textarea).toHaveAttribute('autocorrect', 'off');
  });

  it('libera o envio com um CNIS válido', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Texto do extrato do CNIS'));
    await user.paste(cnisText);
    const button = screen.getByRole('button', { name: 'Analisar' });
    expect(button).not.toHaveAttribute('aria-disabled');
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('mostra aviso NÃO bloqueante quando o texto não parece um CNIS', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Texto do extrato do CNIS'));
    await user.paste('Contrato de locação residencial. '.repeat(10));
    expect(screen.getByText('Não identificamos marcadores típicos de um CNIS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analisar mesmo assim' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Harness />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('InputPanel — PDF', () => {
  beforeEach(() => {
    extractMock.mockReset();
  });

  async function openPdfTab() {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);
    await user.click(screen.getByRole('tab', { name: 'Enviar PDF' }));
    return user;
  }

  function fileInput() {
    return document.querySelector<HTMLInputElement>('input[type="file"]')!;
  }

  it('extrai, mostra a prévia e permite editar na aba de texto', async () => {
    extractMock.mockImplementation(async (_bytes, options) => {
      options?.onProgress?.({ page: 1, total: 2 });
      return { text: cnisText, pageCount: 2, avgNonWhitespacePerPage: 500 };
    });
    const user = await openPdfTab();

    await user.upload(fileInput(), pdfFile());

    expect(await screen.findByRole('region', { name: 'Prévia do texto extraído do PDF' })).toHaveTextContent(
      'Relações Previdenciárias',
    );
    expect(screen.getByText('cnis.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analisar' })).not.toHaveAttribute('aria-disabled');

    await user.click(screen.getByRole('button', { name: 'Editar antes de enviar' }));
    expect(screen.getByRole('tab', { name: 'Colar texto' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Texto do extrato do CNIS')).toHaveValue(cnisText);
  });

  it('bloqueia PDF escaneado e oferece atalho para colar o texto', async () => {
    extractMock.mockResolvedValue({ text: '', pageCount: 3, avgNonWhitespacePerPage: 2 });
    const user = await openPdfTab();

    await user.upload(fileInput(), pdfFile());

    expect(await screen.findByText(/parece ser uma imagem escaneada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisar/i })).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Colar o texto manualmente' }));
    expect(screen.getByRole('tab', { name: 'Colar texto' })).toHaveAttribute('aria-selected', 'true');
  });

  it('rejeita arquivo sem a assinatura %PDF- sem chamar o pdf.js', async () => {
    const user = await openPdfTab();
    await user.upload(fileInput(), pdfFile('PK zip disfarçado'));
    expect(await screen.findByText(/não é um PDF válido/)).toBeInTheDocument();
    expect(extractMock).not.toHaveBeenCalled();
  });

  it('rejeita arquivo com extensão errada', async () => {
    const user = await openPdfTab();
    await user.upload(fileInput(), pdfFile('%PDF-1.7', 'cnis.docx', 'application/msword'));
    expect(await screen.findByText(/não é um PDF\. Escolha/)).toBeInTheDocument();
  });

  it('explica PDF protegido por senha', async () => {
    extractMock.mockImplementation(async () => {
      throw new PdfExtractionError('password');
    });
    const user = await openPdfTab();
    await user.upload(fileInput(), pdfFile());
    expect(await screen.findByText('PDF protegido por senha')).toBeInTheDocument();
  });

  it('explica PDF corrompido', async () => {
    extractMock.mockImplementation(async () => {
      throw new PdfExtractionError('corrupted');
    });
    const user = await openPdfTab();
    await user.upload(fileInput(), pdfFile());
    expect(await screen.findByText('PDF danificado')).toBeInTheDocument();
  });

  it('mostra o progresso da extração', async () => {
    let finish: (() => void) | undefined;
    extractMock.mockImplementation(
      (_bytes, options) =>
        new Promise((resolve) => {
          options?.onProgress?.({ page: 3, total: 18 });
          finish = () => resolve({ text: cnisText, pageCount: 18, avgNonWhitespacePerPage: 500 });
        }),
    );
    const user = await openPdfTab();
    await user.upload(fileInput(), pdfFile());

    expect(await screen.findByText('Extraindo página 3 de 18')).toBeInTheDocument();
    finish?.();
    await waitFor(() => expect(screen.queryByText(/Extraindo página/)).not.toBeInTheDocument());
  });
});
