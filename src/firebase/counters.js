// src/firebase/counters.js
// Contador transaccional de Firestore para códigos cortos de barras

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

/**
 * Obtiene el siguiente consecutivo para códigos de barras cortos de forma atómica.
 * Devuelve el número de secuencia (entero) sin el dígito Luhn.
 * Documento: counters/barcodeShort
 * Campos: { next: number, updatedAt: TS }
 */
export async function getNextBarcodeSequence(db) {
  const ref = doc(db, "counters", "barcodeShort");
  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    let next = 1;
    if (!snap.exists()) {
      tx.set(ref, { next: 1, updatedAt: serverTimestamp() });
      next = 1;
    } else {
      const curr = Number(snap.data().next || 0);
      next = curr + 1;
      tx.update(ref, { next, updatedAt: serverTimestamp() });
    }
    return next;
  });
  return seq;
}

