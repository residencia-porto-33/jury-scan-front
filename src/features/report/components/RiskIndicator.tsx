import type { Risco } from '../../analysis/types';
import { cx } from '../../../shared/lib/cx';
import { RISCO_VISUAL } from '../utils/labels';

export function RiskIndicator({ risco }: { risco: Risco }) {
  const visual = RISCO_VISUAL[risco];
  return (
    <div className={cx('flex items-center gap-3 rounded-lg border p-4', visual.className)}>
      <span aria-hidden="true">{visual.icon}</span>
      <div>
        <p className="text-lg font-semibold">Risco agregado: {visual.label}</p>
        <p className="text-sm text-fg">{visual.description}</p>
      </div>
    </div>
  );
}
