// Gera os PDFs de teste em src/test/fixtures a partir do CNIS fictício.
// Uso: npm run fixtures:pdf
import { readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

import { PDFDocument, StandardFonts } from 'pdf-lib';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('src/mocks/fixtures/cnis-ficticio.txt', root), 'utf8');

// O WinAnsiEncoding das fontes padrão cobre os acentos do português.
async function buildTextPdf() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('CNIS ficticio');
  pdf.setProducer('juryscan-web fixtures');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 7;
  const lineHeight = 11;
  const margin = 36;
  const lines = source.split(/\r?\n/);
  const half = Math.ceil(lines.length / 2);

  for (const chunk of [lines.slice(0, half), lines.slice(half)]) {
    const page = pdf.addPage([842, 595]); // A4 paisagem
    let y = page.getHeight() - margin;
    for (const line of chunk) {
      // Colunas separadas por 3+ espaços viram posições X distintas, como numa tabela real.
      let x = margin;
      for (const cell of line.split(/ {3,}/)) {
        if (cell) page.drawText(cell, { x, y, size: fontSize, font });
        x += Math.max(font.widthOfTextAtSize(cell, fontSize) + 18, 60);
      }
      y -= lineHeight;
    }
  }
  return pdf.save();
}

// PNG cinza mínimo, sem nenhum texto — simula um PDF escaneado.
function grayPng(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const raw = Buffer.alloc((width + 1) * height);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) raw[row * (width + 1) + 1 + col] = (row + col) % 2 ? 200 : 230;
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function buildImagePdf() {
  const pdf = await PDFDocument.create();
  pdf.setProducer('juryscan-web fixtures');
  const image = await pdf.embedPng(grayPng(120, 80));
  for (let i = 0; i < 2; i += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawImage(image, { x: 40, y: 300, width: 515, height: 340 });
  }
  return pdf.save();
}

await writeFile(new URL('src/test/fixtures/cnis-texto.pdf', root), await buildTextPdf());
await writeFile(new URL('src/test/fixtures/cnis-imagem.pdf', root), await buildImagePdf());
console.log('PDFs de teste gerados em src/test/fixtures/');
