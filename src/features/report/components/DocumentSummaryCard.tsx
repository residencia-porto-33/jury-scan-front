import { Eye, EyeOff } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import type { NormalizedSummary } from '../../analysis/types';
import { Button } from '../../../shared/components/Button';
import { maskDocumentNumber, maskPersonalNumbers } from '../utils/mask';

interface DocumentSummaryCardProps {
  summary: NormalizedSummary;
  hidePersonal: boolean;
  onTogglePersonal: () => void;
}

function NotIdentified() {
  return <span className="text-fg-muted italic">Não identificado</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words sm:mt-0">{children}</dd>
    </div>
  );
}

export function DocumentSummaryCard({ summary, hidePersonal, onTogglePersonal }: DocumentSummaryCardProps) {
  const headingId = useId();
  const show = (value: string | undefined, mask: (v: string) => string = maskDocumentNumber) =>
    value === undefined ? <NotIdentified /> : hidePersonal ? mask(value) : value;

  return (
    <section
      aria-labelledby={headingId}
      className="print-break-avoid rounded-xl border border-line bg-surface p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="font-semibold">
          Resumo do documento
        </h3>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={hidePersonal}
          icon={hidePersonal ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          onClick={onTogglePersonal}
        >
          {hidePersonal ? 'Mostrar dados pessoais' : 'Ocultar dados pessoais'}
        </Button>
      </div>
      <dl className="divide-y divide-line">
        <Field label="CPF">{show(summary.cpf)}</Field>
        <Field label="NIT/PIS/PASEP">{show(summary.nitPisPasep)}</Field>
        <Field label="Período">{show(summary.periodo, (v) => v)}</Field>
        <Field label="Vínculos">
          {summary.vinculos.length === 0 ? (
            <NotIdentified />
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {summary.vinculos.map((vinculo, index) => (
                <li key={index}>{hidePersonal ? maskPersonalNumbers(vinculo) : vinculo}</li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Contexto de benefício">{show(summary.contextoBeneficio, maskPersonalNumbers)}</Field>
      </dl>
    </section>
  );
}
