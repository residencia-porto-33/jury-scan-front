import { describe, expect, it } from 'vitest';

import { buildLines, type PositionedText } from './buildLines';

const item = (str: string, x: number, y: number, width = str.length * 5, height = 10): PositionedText => ({
  str,
  transform: [height, 0, 0, height, x, y],
  width,
  height,
});

describe('buildLines', () => {
  it('ordena linhas de cima para baixo e itens da esquerda para a direita', () => {
    const text = buildLines([item('Fim', 300, 700), item('Início', 0, 700), item('Linha 1', 0, 800)]);
    expect(text).toBe('Linha 1\nInício   Fim');
  });

  it('agrupa itens com pequena diferença de Y na mesma linha', () => {
    const text = buildLines([item('01/2010', 0, 500), item('1.850,00', 100, 501.5)]);
    expect(text).toBe('01/2010   1.850,00');
  });

  it('junta fragmentos colados sem espaço extra e separa palavras próximas com um espaço', () => {
    const text = buildLines([item('EMPR', 0, 100, 20), item('ESA', 20, 100, 15), item('ALFA', 37, 100, 20)]);
    expect(text).toBe('EMPRESA ALFA');
  });

  it('ignora itens vazios', () => {
    expect(buildLines([item('', 0, 100), item('texto', 10, 100)])).toBe('texto');
  });
});
