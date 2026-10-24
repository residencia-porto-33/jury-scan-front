import { PencilLine, RotateCcw } from 'lucide-react';
import { useEffect, useState, type Ref } from 'react';

import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import type { DomainError } from '../types';

interface AnalysisErrorAlertProps {
  error: DomainError;
  titleRef: Ref<HTMLHeadingElement>;
  onRetry: () => void;
  onReviewText: () => void;
}

/** Mensagem segura por tipo de erro: nunca exibe corpo de resposta, stack ou detalhe do servidor. */
export function AnalysisErrorAlert({ error, titleRef, onRetry, onReviewText }: AnalysisErrorAlertProps) {
  const waitSeconds = useCountdown(error.retryAfterSec);

  return (
    <Alert
      tone={error.kind === 'cancelled' ? 'warning' : 'error'}
      title={error.title}
      titleRef={titleRef}
      headingLevel={2}
      actions={
        error.retryable ? (
          <Button
            icon={<RotateCcw className="size-4" />}
            onClick={onRetry}
            softDisabled={waitSeconds > 0}
            size="sm"
          >
            {waitSeconds > 0 ? `Tentar novamente em ${waitSeconds} s` : 'Tentar novamente'}
          </Button>
        ) : (
          <Button icon={<PencilLine className="size-4" />} onClick={onReviewText} size="sm">
            Revisar o texto
          </Button>
        )
      }
    >
      <p>{error.message}</p>
    </Alert>
  );
}

function useCountdown(seconds: number | undefined): number {
  const [remaining, setRemaining] = useState(seconds ?? 0);

  useEffect(() => {
    if (!seconds) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return remaining;
}
