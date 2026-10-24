import { useId } from 'react';

export function PriorityActions({ actions }: { actions: readonly string[] }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="print-break-avoid rounded-xl border border-line bg-surface p-4"
    >
      <h3 id={headingId} className="mb-2 font-semibold">
        Ações prioritárias
      </h3>
      {actions.length === 0 ? (
        <p className="text-sm text-fg-muted">Nenhuma ação prioritária sugerida.</p>
      ) : (
        <ol className="list-decimal space-y-2 pl-5 marker:font-semibold">
          {actions.map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
