import type { TextRange } from '../types';

interface NormalizedHaystack {
  value: string;
  /** Para cada posição de `value`, a posição correspondente no texto original. */
  map: number[];
}

/**
 * Normaliza para comparação: qualquer sequência de espaços/quebras vira um espaço e
 * tudo vai para minúsculas, guardando o mapa de posições para destacar o trecho original.
 */
function normalizeWithMap(text: string): NormalizedHaystack {
  let value = '';
  const map: number[] = [];
  let inWhitespace = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (/\s/.test(char)) {
      if (!inWhitespace) {
        value += ' ';
        map.push(index);
      }
      inWhitespace = true;
      continue;
    }
    inWhitespace = false;
    const lower = char.toLowerCase();
    for (let k = 0; k < lower.length; k += 1) {
      value += lower[k];
      map.push(index);
    }
  }
  return { value, map };
}

function normalizeNeedle(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, '')
    .trim()
    .toLowerCase();
}

/** Prepara o texto enviado uma vez e devolve uma função de busca para cada evidência. */
export function createEvidenceLocator(sentText: string): (evidence: string) => TextRange | undefined {
  const haystack = normalizeWithMap(sentText);

  return (evidence) => {
    const needle = normalizeNeedle(evidence);
    if (needle.length === 0) return undefined;
    const start = haystack.value.indexOf(needle);
    if (start === -1) return undefined;
    const originalStart = haystack.map[start];
    const originalLast = haystack.map[start + needle.length - 1];
    if (originalStart === undefined || originalLast === undefined) return undefined;
    return { start: originalStart, end: originalLast + 1 };
  };
}
