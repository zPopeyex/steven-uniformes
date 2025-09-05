import { shortenUrlFree } from "./freeShorteners";

/**
 * Abre una pestaña inmediatamente y la redirige al shortUrl cuando esté listo.
 * Fallback: si falla o el popup es bloqueado, navega a longUrl.
 *
 * @param {string} longUrl
 * @param {{ app?: import('firebase/app').FirebaseApp }} [opts]
 */
export async function openShortInvoiceUrl(longUrl, opts = {}) {
  const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
  try {
    const shortUrl = await shortenUrlOfficial(longUrl, opts);

    if (popup) {
      popup.location = shortUrl; // ✅ abre de inmediato, sin countdown
    } else {
      window.location.assign(shortUrl);
    }
  } catch (err) {
    console.error("Shorten error", err);
    if (popup) {
      popup.location = longUrl; // fallback inmediato
    } else {
      window.location.assign(longUrl);
    }
  }
}

/**
 * Utility: sólo acorta y retorna la URL (sin abrir ventana).
 * @param {string} longUrl
 * @param {{ app?: import('firebase/app').FirebaseApp }} [opts]
 * @returns {Promise<string>}
 */
export async function shortenUrlOfficial(longUrl, opts = {}) {
  // Prefer free public shortener (no server needed). Preserves full query.
  const short = await shortenUrlFree(longUrl);
  if (short && typeof short === "string") return short;
  return longUrl;
}
