import { ArrowLeft, X } from 'lucide-react';
import { useId, type RefObject } from 'react';

import type { TextRange } from '../../analysis/types';
import { Button } from '../../../shared/components/Button';
import { TextPreview } from '../../../shared/components/TextPreview';

interface SourceTextPanelProps {
  text: string;
  highlight: TextRange | undefined;
  /** Achado que abriu o painel, para o botão "voltar". */
  fromIssueId: string | undefined;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onClose: () => void;
}

/** Texto exatamente como foi enviado, com a evidência destacada. */
export function SourceTextPanel({
  text,
  highlight,
  fromIssueId,
  headingRef,
  onBack,
  onClose,
}: SourceTextPanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="no-print space-y-3 rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-semibold">
          Texto enviado para análise
        </h3>
        <div className="flex flex-wrap gap-2">
          {fromIssueId ? (
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
              Voltar ao achado {fromIssueId}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
      <TextPreview
        text={text}
        highlight={highlight}
        label="Texto enviado, com a evidência destacada"
        className="max-h-[28rem]"
      />
    </section>
  );
}
