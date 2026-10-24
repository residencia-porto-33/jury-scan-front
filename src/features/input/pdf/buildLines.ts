/** Subconjunto de `TextItem` do pdf.js usado na reconstrução das linhas. */
export interface PositionedText {
  str: string;
  /** Matriz [a, b, c, d, x, y]. */
  transform: number[];
  width: number;
  height: number;
}

interface Line {
  y: number;
  height: number;
  items: PositionedText[];
}

/**
 * Reconstrói as linhas de uma página a partir das posições dos itens de texto.
 *
 * O pdf.js entrega fragmentos na ordem do fluxo de conteúdo, que em tabelas do CNIS
 * nem sempre segue a leitura visual. Agrupar por Y (com tolerância proporcional à
 * fonte) e ordenar por X preserva as linhas da tabela — e com elas a evidência.
 */
export function buildLines(items: PositionedText[]): string {
  const lines: Line[] = [];

  for (const item of items) {
    if (item.str.length === 0) continue;
    const y = item.transform[5] ?? 0;
    const height = Math.abs(item.height) || Math.abs(item.transform[3] ?? 0) || 10;
    const tolerance = Math.max(2, height * 0.5);
    const line = lines.find((candidate) => Math.abs(candidate.y - y) <= tolerance);
    if (line) {
      line.items.push(item);
      line.height = Math.max(line.height, height);
    } else {
      lines.push({ y, height, items: [item] });
    }
  }

  // Coordenadas do PDF crescem de baixo para cima.
  lines.sort((a, b) => b.y - a.y);

  return lines.map(joinLine).join('\n');
}

function joinLine(line: Line): string {
  const sorted = [...line.items].sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
  let output = '';
  let previousEnd: number | undefined;

  for (const item of sorted) {
    const x = item.transform[4] ?? 0;
    if (previousEnd !== undefined && output.length > 0) {
      const gap = x - previousEnd;
      const needsSeparator = !/\s$/.test(output) && !/^\s/.test(item.str);
      if (gap > line.height * 1.5) {
        // Espaço largo = mudança de coluna da tabela.
        output = output.replace(/\s+$/, '') + '   ';
      } else if (needsSeparator && gap > line.height * 0.15) {
        output += ' ';
      }
    }
    output += item.str;
    previousEnd = x + item.width;
  }

  return output.replace(/\s+$/, '');
}
