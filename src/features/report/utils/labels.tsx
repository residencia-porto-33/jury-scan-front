import {
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { Risco, Severidade } from '../../analysis/types';

interface Visual {
  label: string;
  icon: ReactNode;
  /** Classes de texto/fundo/borda — sempre acompanhadas de ícone e texto. */
  className: string;
}

export const SEVERIDADE_VISUAL: Record<Severidade, Visual> = {
  alta: {
    label: 'Alta',
    icon: <AlertOctagon className="size-3.5" />,
    className: 'text-sev-alta bg-sev-alta-bg border-sev-alta-line',
  },
  media: {
    label: 'Média',
    icon: <TriangleAlert className="size-3.5" />,
    className: 'text-sev-media bg-sev-media-bg border-sev-media-line',
  },
  baixa: {
    label: 'Baixa',
    icon: <AlertTriangle className="size-3.5" />,
    className: 'text-sev-baixa bg-sev-baixa-bg border-sev-baixa-line',
  },
  info: {
    label: 'Info',
    icon: <Info className="size-3.5" />,
    className: 'text-sev-info bg-sev-info-bg border-sev-info-line',
  },
};

export const RISCO_VISUAL: Record<Risco, Visual & { description: string }> = {
  alto: {
    label: 'Alto',
    icon: <ShieldAlert className="size-6" />,
    className: 'text-risk-alto bg-risk-alto-bg border-sev-alta-line',
    description: 'Há pendências que podem afetar o direito ou o cálculo. Priorize a revisão.',
  },
  medio: {
    label: 'Médio',
    icon: <ShieldQuestion className="size-6" />,
    className: 'text-risk-medio bg-risk-medio-bg border-sev-media-line',
    description: 'Há pontos que pedem conferência antes de seguir.',
  },
  baixo: {
    label: 'Baixo',
    icon: <ShieldCheck className="size-6" />,
    className: 'text-risk-baixo bg-risk-baixo-bg border-line',
    description: 'Poucos pontos de atenção encontrados pela triagem.',
  },
};

export function formatConfianca(confianca: number): string {
  return `${Math.round(confianca * 100)}%`;
}
