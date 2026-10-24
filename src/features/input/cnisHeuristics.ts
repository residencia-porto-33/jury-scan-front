import { foldText } from '../../shared/lib/text';

/**
 * Marcadores típicos de um extrato CNIS. A heurística serve apenas para um aviso
 * NÃO bloqueante: quem decide se o documento é um CNIS é o backend.
 */
const CNIS_MARKERS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'CNIS', pattern: /\bcnis\b/ },
  { label: 'Cadastro Nacional de Informações Sociais', pattern: /cadastro nacional de informacoes sociais/ },
  { label: 'NIT', pattern: /\bnit\b/ },
  { label: 'Relações Previdenciárias', pattern: /relacoes previdenciarias/ },
  { label: 'Remunerações', pattern: /\bremuneracoes\b/ },
];

export function findCnisMarkers(text: string): string[] {
  const folded = foldText(text);
  return CNIS_MARKERS.filter(({ pattern }) => pattern.test(folded)).map(({ label }) => label);
}

export function looksLikeCnis(text: string): boolean {
  return findCnisMarkers(text).length > 0;
}
