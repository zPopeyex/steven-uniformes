// src/utils/sizes.js
// Comparador de tallas centralizado

export const GENERAL_ORDER = [
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

// Orden especial para Pantalón/Pantalon en catálogo
export const PANTALON_ORDER = [
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
];

export function sizeIndex(size, order = GENERAL_ORDER) {
  const s = String(size || "").trim().toUpperCase();
  return order.indexOf(s);
}

export function compareSizes(a, b, order = GENERAL_ORDER) {
  const ia = sizeIndex(a, order);
  const ib = sizeIndex(b, order);
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
}

export function sizeInRange(size, from, to, order = GENERAL_ORDER) {
  const i = sizeIndex(size, order);
  const f = sizeIndex(from, order);
  const t = sizeIndex(to, order);
  if (i === -1 || f === -1 || t === -1) return false;
  return i >= Math.min(f, t) && i <= Math.max(f, t);
}
