import { Scale } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const DISCLAIMER_TEXT =
  'O JuryScan é uma ferramenta de apoio à triagem. O resultado não concede nem indefere benefícios, não substitui profissional habilitado e não constitui parecer jurídico. Revisão humana obrigatória.';

/**
 * Aviso fixo e não dispensável em toda a tela de relatório. Publica sua altura em
 * `--disclaimer-height`, usada no `scroll-padding-top` para não cobrir o foco (WCAG 2.4.11).
 */
export function Disclaimer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!element) return;
    const update = () => root.style.setProperty('--disclaimer-height', `${element.offsetHeight}px`);
    update();
    if (typeof ResizeObserver === 'undefined') return () => root.style.removeProperty('--disclaimer-height');
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--disclaimer-height');
    };
  }, []);

  return (
    <div
      ref={ref}
      role="note"
      aria-label="Aviso de revisão humana obrigatória"
      className="print-disclaimer sticky top-0 z-30 border-b border-sev-media-line bg-sev-media-bg"
    >
      <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 text-sm text-fg">
        <Scale aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sev-media" />
        <span>{DISCLAIMER_TEXT}</span>
      </p>
    </div>
  );
}
