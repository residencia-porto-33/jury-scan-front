import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

import { cx } from '../lib/cx';

export type AlertTone = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
  tone: AlertTone;
  title: string;
  id?: string;
  children?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2 | 3 | 4;
  /** Permite mover o foco para o título (após erro, por exemplo). */
  titleRef?: Ref<HTMLHeadingElement>;
  role?: 'alert' | 'status';
  className?: string;
}

const tones: Record<AlertTone, { box: string; icon: ReactNode; label: string }> = {
  info: {
    box: 'border-sev-baixa-line bg-sev-baixa-bg',
    icon: <Info className="size-5 text-sev-baixa" />,
    label: 'Informação',
  },
  warning: {
    box: 'border-sev-media-line bg-sev-media-bg',
    icon: <AlertTriangle className="size-5 text-sev-media" />,
    label: 'Atenção',
  },
  error: {
    box: 'border-sev-alta-line bg-sev-alta-bg',
    icon: <XCircle className="size-5 text-sev-alta" />,
    label: 'Erro',
  },
  success: {
    box: 'border-line bg-risk-baixo-bg',
    icon: <CheckCircle2 className="size-5 text-risk-baixo" />,
    label: 'Sucesso',
  },
};

export function Alert({
  tone,
  title,
  id,
  children,
  actions,
  headingLevel = 3,
  titleRef,
  role,
  className,
}: AlertProps) {
  const Heading = `h${headingLevel}` as const;
  const style = tones[tone];

  return (
    <div id={id} role={role} className={cx('rounded-lg border p-4 text-fg', style.box, className)}>
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {style.icon}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Heading ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="font-semibold">
            <span className="sr-only">{style.label}: </span>
            {title}
          </Heading>
          {children ? <div className="text-sm leading-relaxed">{children}</div> : null}
          {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
