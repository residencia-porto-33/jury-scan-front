import { X } from 'lucide-react';

import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { env } from '../../../shared/config/env';

/**
 * Estado "Processando". A chamada é síncrona, então não há progresso real do
 * servidor: mostramos o tempo máximo esperado e a opção de cancelar.
 */
export function AnalysisProgress({ onCancel }: { onCancel: () => void }) {
  const maxSeconds = Math.round(env.requestTimeoutMs / 1000);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-muted p-4">
      <Spinner className="text-primary" />
      <p className="flex-1 text-sm">
        <span className="font-medium">Analisando o documento.</span> Isso pode levar até {maxSeconds}{' '}
        segundos.
      </p>
      <Button variant="secondary" size="sm" icon={<X className="size-4" />} onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
