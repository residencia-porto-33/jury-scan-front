import { FileWarning, Upload } from 'lucide-react';
import type { RefObject } from 'react';

import type { NormalizedAnalysis } from '../../analysis/types';
import { Button } from '../../../shared/components/Button';

interface DocumentPendingNoticeProps {
  result: NormalizedAnalysis;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onNewAnalysis: () => void;
}

/**
 * Substitui o relatório quando o documento não é um CNIS.
 * Propositalmente não mostra risco, totais nem achados: não há conclusão previdenciária.
 */
export function DocumentPendingNotice({ result, titleRef, onNewAnalysis }: DocumentPendingNoticeProps) {
  const pendencias = [
    ...result.issues.flatMap((issue) => [issue.descricao, issue.sugestao]),
    ...result.acoesPrioritarias,
  ].filter((item, index, all): item is string => item !== undefined && all.indexOf(item) === index);

  return (
    <section
      aria-labelledby="pendencia-titulo"
      className="space-y-4 rounded-xl border border-sev-media-line bg-surface p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <FileWarning aria-hidden="true" className="mt-1 size-6 shrink-0 text-sev-media" />
        <div className="space-y-2">
          <h2 id="pendencia-titulo" ref={titleRef} tabIndex={-1} className="text-xl font-semibold">
            Documento não reconhecido como CNIS
          </h2>
          <p>
            O documento enviado não foi reconhecido como extrato do CNIS. Por isso,{' '}
            <strong>nenhuma conclusão previdenciária foi feita</strong>.
          </p>
        </div>
      </div>

      {pendencias.length > 0 ? (
        <div>
          <h3 className="mb-2 font-semibold">Pendências documentais</h3>
          <ul className="list-disc space-y-1 pl-5">
            {pendencias.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button icon={<Upload className="size-4" />} onClick={onNewAnalysis} className="no-print">
        Enviar outro documento
      </Button>
    </section>
  );
}
