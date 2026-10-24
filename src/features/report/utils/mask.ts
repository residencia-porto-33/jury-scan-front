/**
 * Máscara de CPF/NIT para quando a tela é compartilhada com o cliente.
 * Troca dígito por "*" um a um (o tamanho do texto não muda, então as posições
 * das evidências continuam válidas) e mantém só o 7º–9º dígitos visíveis,
 * como em `***.***.789-**`.
 */
export function maskDocumentNumber(value: string): string {
  const digitCount = value.replace(/\D/g, '').length;
  const keepFrom = digitCount - 5;
  const keepTo = digitCount - 2;
  let digitIndex = -1;
  return value.replace(/\d/g, (digit) => {
    digitIndex += 1;
    return digitIndex >= keepFrom && digitIndex < keepTo ? digit : '*';
  });
}

// CPF (000.000.000-00) e NIT/PIS/PASEP (000.00000.00-0), com ou sem pontuação.
const DOCUMENT_NUMBER = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{3}\.?\d{5}\.?\d{2}-?\d\b/g;

/** Mascara todos os CPFs e NITs encontrados em um texto livre. */
export function maskPersonalNumbers(text: string): string {
  return text.replace(DOCUMENT_NUMBER, maskDocumentNumber);
}
