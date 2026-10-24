import { useEffect, useRef } from 'react';

import { cx } from '../lib/cx';

export interface TextRange {
  start: number;
  end: number;
}

interface TextPreviewProps {
  text: string;
  label: string;
  /** Trecho destacado com `<mark>` e rolado para a vista. */
  highlight?: TextRange | undefined;
  className?: string;
}

/** Texto longo, somente leitura, monoespaçado e rolável (acessível por teclado). */
export function TextPreview({ text, label, highlight, className }: TextPreviewProps) {
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!highlight || !mark) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    mark.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [highlight]);

  const range =
    highlight && highlight.start >= 0 && highlight.end <= text.length && highlight.start < highlight.end
      ? highlight
      : undefined;

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cx(
        'max-h-96 overflow-auto rounded-md border border-line bg-surface-muted p-3 font-mono text-xs leading-relaxed',
        className,
      )}
    >
      <pre className="break-words whitespace-pre-wrap">
        {range ? (
          <>
            {text.slice(0, range.start)}
            <mark ref={markRef} className="rounded-sm px-0.5">
              {text.slice(range.start, range.end)}
            </mark>
            {text.slice(range.end)}
          </>
        ) : (
          text
        )}
      </pre>
    </div>
  );
}
