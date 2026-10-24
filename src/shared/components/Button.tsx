import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';

import { cx } from '../lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /**
   * Desabilita sem tirar o botão da ordem de foco (`aria-disabled`), para que o
   * leitor de tela ainda alcance o motivo ligado por `aria-describedby`.
   */
  softDisabled?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover border border-transparent',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-surface-muted',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-surface-muted',
  danger: 'bg-surface text-sev-alta border border-sev-alta-line hover:bg-sev-alta-bg',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-8 px-3 text-sm',
  md: 'min-h-10 px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  softDisabled = false,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (softDisabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      aria-disabled={softDisabled || undefined}
      onClick={handleClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
