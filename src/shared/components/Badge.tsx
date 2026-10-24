import type { ReactNode } from 'react';

import { cx } from '../lib/cx';

interface BadgeProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Selo com ícone + texto. As cores vêm do chamador; o texto sempre carrega o significado. */
export function Badge({ icon, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
