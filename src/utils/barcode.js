// src/utils/barcode.js
// Utilidades para generar y validar códigos de barras cortos (8 dígitos)
// Formato: 7 dígitos consecutivos + 1 dígito de verificación (Luhn)

/**
 * Calcula el dígito verificador Luhn para una cadena numérica.
 * Devuelve un solo dígito (0-9) como string.
 */
export function luhnCheckDigit(numStr) {
  const digits = String(numStr).replace(/\D/g, "").split("").map(Number);
  let sum = 0;
  // Recorremos de derecha a izquierda
  for (let i = digits.length - 1, pos = 0; i >= 0; i--, pos++) {
    let d = digits[i];
    if (pos % 2 === 0) {
      // Doblar cada segundo dígito comenzando desde la derecha (posición 0)
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const mod = sum % 10;
  return String((10 - mod) % 10);
}

/**
 * Genera el código corto (8 dígitos) a partir de una secuencia numérica.
 * - seq: número entero positivo
 * - Rellena con ceros a la izquierda para 7 dígitos y añade dígito Luhn.
 */
export function formatShortBarcodeFromSeq(seq) {
  const base7 = String(Math.max(1, Number(seq) || 1)).padStart(7, "0");
  const cd = luhnCheckDigit(base7);
  return base7 + cd;
}

/**
 * Valida un código corto (8 dígitos) mediante Luhn.
 */
export function isValidShortBarcode(code) {
  const s = String(code || "").trim();
  if (!/^\d{8}$/.test(s)) return false;
  const base7 = s.slice(0, 7);
  const expected = luhnCheckDigit(base7);
  return expected === s[7];
}

