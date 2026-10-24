import { FileText, PencilLine, RefreshCw } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { TextPreview } from '../../../shared/components/TextPreview';
import { formatBytes, formatNumber, pluralize } from '../../../shared/lib/text';
import type { PdfMeta } from '../types';

interface ExtractedPreviewProps {
  text: string;
  meta: PdfMeta;
  disabled: boolean;
  onEdit: () => void;
  onReplace: () => void;
}

export function ExtractedPreview({ text, meta, disabled, onEdit, onReplace }: ExtractedPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <FileText aria-hidden="true" className="size-4 text-fg-muted" />
        <span className="font-medium break-all">{meta.fileName}</span>
        <span className="text-fg-muted">
          {pluralize(meta.pageCount, 'página', 'páginas')} · {formatNumber(meta.charCount)} caracteres ·{' '}
          {formatBytes(meta.sizeBytes)}
        </span>
      </div>
      <TextPreview text={text} label="Prévia do texto extraído do PDF" />
      <p className="text-sm text-fg-muted">
        Confira se o texto extraído está legível. A análise usa exatamente este conteúdo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={<PencilLine className="size-4" />}
          onClick={onEdit}
          disabled={disabled}
        >
          Editar antes de enviar
        </Button>
        <Button
          variant="ghost"
          icon={<RefreshCw className="size-4" />}
          onClick={onReplace}
          disabled={disabled}
        >
          Trocar arquivo
        </Button>
      </div>
    </div>
  );
}
