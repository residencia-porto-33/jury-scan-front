import { ClipboardPaste, FilePlus2, FileText } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { formatNumber, pluralize } from '../../../shared/lib/text';
import type { PdfMeta } from '../types';

interface InputSummaryBarProps {
  text: string;
  source: PdfMeta | undefined;
  onNewAnalysis: () => void;
}

/** Entrada recolhida depois do resultado: o que foi analisado + "Nova análise". */
export function InputSummaryBar({ text, source, onNewAnalysis }: InputSummaryBarProps) {
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface p-3 text-sm">
      {source ? (
        <FileText aria-hidden="true" className="size-4 text-fg-muted" />
      ) : (
        <ClipboardPaste aria-hidden="true" className="size-4 text-fg-muted" />
      )}
      <p className="min-w-0 flex-1">
        <span className="font-medium">Documento:</span>{' '}
        {source ? (
          <>
            <span className="break-all">{source.fileName}</span> ·{' '}
            {pluralize(source.pageCount, 'página', 'páginas')} ·{' '}
          </>
        ) : (
          'texto colado · '
        )}
        {formatNumber(text.length)} caracteres
      </p>
      <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={onNewAnalysis}>
        Nova análise
      </Button>
    </div>
  );
}
