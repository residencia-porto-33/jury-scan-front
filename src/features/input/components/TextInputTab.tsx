import { useId, type RefObject } from 'react';

import { env } from '../../../shared/config/env';
import { cx } from '../../../shared/lib/cx';
import { formatNumber } from '../../../shared/lib/text';

interface TextInputTabProps {
  text: string;
  onChange: (text: string) => void;
  readOnly: boolean;
  /** Mensagem de erro do campo (ex.: texto acima do limite). */
  errorMessage: string | undefined;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export function TextInputTab({ text, onChange, readOnly, errorMessage, textareaRef }: TextInputTabProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const overLimit = text.length > env.maxInputChars;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">
        Texto do extrato do CNIS
      </label>
      <p id={hintId} className="text-sm text-fg-muted">
        Copie o conteúdo do CNIS (Meu INSS) e cole abaixo. O texto fica apenas nesta aba do navegador até você
        enviar para análise.
      </p>
      <textarea
        id={id}
        ref={textareaRef}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        rows={14}
        // LGPD: corretores avançados de alguns navegadores enviam o texto a servidores externos.
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        data-enable-grammarly="false"
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={cx(hintId, counterId, errorMessage && errorId)}
        className={cx(
          'block w-full resize-y rounded-md border bg-surface p-3 font-mono text-sm leading-relaxed text-fg',
          'placeholder:text-fg-muted read-only:bg-surface-muted',
          errorMessage ? 'border-sev-alta' : 'border-line-strong',
        )}
        placeholder="Cole aqui o texto do CNIS…"
      />
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        <p id={errorId} className="font-medium text-sev-alta" hidden={!errorMessage}>
          {errorMessage}
        </p>
        <p
          id={counterId}
          className={cx('ml-auto tabular-nums', overLimit ? 'text-sev-alta' : 'text-fg-muted')}
        >
          {formatNumber(text.length)} / {formatNumber(env.maxInputChars)} caracteres
        </p>
      </div>
    </div>
  );
}
