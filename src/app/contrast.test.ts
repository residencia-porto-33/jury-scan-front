// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Garante WCAG AA nos tokens de cor: lê as variáveis de `index.css` (tema claro
 * e escuro) e confere cada par texto/fundo usado pelos componentes.
 */
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

function readTokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}

const lightBlock = /:root\s*{([^}]*)}/.exec(css)?.[1] ?? '';
const darkBlock = /prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/.exec(css)?.[1] ?? '';
const light = readTokens(lightBlock);
const themes = { claro: light, escuro: { ...light, ...readTokens(darkBlock) } };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

// [texto, fundo, mínimo]
const PAIRS: Array<[string, string, number]> = [
  ['fg', 'bg', 4.5],
  ['fg', 'surface', 4.5],
  ['fg', 'surface-muted', 4.5],
  ['fg-muted', 'bg', 4.5],
  ['fg-muted', 'surface', 4.5],
  ['fg-muted', 'surface-muted', 4.5],
  ['primary-fg', 'primary', 4.5],
  ['primary-fg', 'primary-hover', 4.5],
  ['primary', 'surface', 4.5],
  ['bg', 'fg', 4.5],
  ['mark-fg', 'mark-bg', 4.5],
  ...(['alta', 'media', 'baixa', 'info'] as const).flatMap((sev): Array<[string, string, number]> => [
    [`sev-${sev}-fg`, `sev-${sev}-bg`, 4.5],
    [`sev-${sev}-fg`, 'surface', 4.5],
    ['fg', `sev-${sev}-bg`, 4.5],
  ]),
  ...(['alto', 'medio', 'baixo'] as const).flatMap((risk): Array<[string, string, number]> => [
    [`risk-${risk}-fg`, `risk-${risk}-bg`, 4.5],
    [`risk-${risk}-fg`, 'surface', 4.5],
    ['fg', `risk-${risk}-bg`, 4.5],
  ]),
  // Foco visível: componente não-textual, mínimo 3:1 (WCAG 1.4.11).
  ['focus', 'surface', 3],
  ['focus', 'bg', 3],
  ['focus', 'sev-media-bg', 3],
];

it('lê os tokens dos dois temas', () => {
  expect(Object.keys(light).length).toBeGreaterThan(20);
  expect(Object.keys(readTokens(darkBlock)).length).toBeGreaterThan(20);
  expect(themes.escuro.bg).not.toBe(themes.claro.bg);
});

describe.each(Object.entries(themes))('contraste — tema %s', (_name, tokens) => {
  it.each(PAIRS)('%s sobre %s ≥ %d:1', (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
