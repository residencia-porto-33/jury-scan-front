import { AlertTriangle, Check, Copy, FileSearch } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { Button } from '../../../shared/components/Button';

interface EvidenceBlockProps {
  evidencia: string;
  localizada: boolean;
  /** Identificador do achado, para nomes acessíveis únicos. */
  issueId: string;
  onShowInDocument: (() => void) | undefined;
}

/** O elemento mais importante do achado: o trecho exato do CNIS que o sustenta. */
export function EvidenceBlock({ evidencia, localizada, issueId, onShowInDocument }: EvidenceBlockProps) {
  const labelId = useId();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(evidencia);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure aria-labelledby={labelId} className="rounded-lg border-2 border-primary/40 bg-surface-muted p-3">
      <figcaption id={labelId} className="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
        Evidência no CNIS
      </figcaption>
      <blockquote className="border-l-4 border-primary pl-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-fg">
        {evidencia}
      </blockquote>

      {!localizada ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-sev-media-line bg-sev-media-bg p-2 text-sm font-medium text-fg">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sev-media" />
          Trecho não encontrado literalmente no texto enviado — confira com atenção.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2" role="toolbar" aria-label={`Ações da evidência ${issueId}`}>
        <Button
          variant="secondary"
          size="sm"
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={() => void copy()}
        >
          {copied ? 'Copiada' : 'Copiar evidência'} <span className="sr-only">{issueId}</span>
        </Button>
        {localizada && onShowInDocument ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSearch className="size-4" />}
            onClick={onShowInDocument}
          >
            Ver no documento <span className="sr-only">(evidência {issueId})</span>
          </Button>
        ) : null}
      </div>
      <span role="status" className="sr-only">
        {copied ? 'Evidência copiada.' : ''}
      </span>
    </figure>
  );
}
