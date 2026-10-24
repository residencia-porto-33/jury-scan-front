import type { Severidade } from '../../analysis/types';
import { Badge } from '../../../shared/components/Badge';
import { SEVERIDADE_VISUAL } from '../utils/labels';

export function SeverityBadge({ severidade }: { severidade: Severidade }) {
  const visual = SEVERIDADE_VISUAL[severidade];
  return (
    <Badge icon={visual.icon} className={visual.className}>
      Severidade {visual.label.toLowerCase()}
    </Badge>
  );
}
