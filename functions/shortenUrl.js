import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

const TINYURL_API_TOKEN = defineSecret("TINYURL_API_TOKEN");
const db = getFirestore();

export const shortenUrl = onCall(
  { region: "us-central1", secrets: [TINYURL_API_TOKEN], cors: true },
  async (req) => {
    const { longUrl, alias, domain } = req.data || {};
    const cleanUrl = typeof longUrl === "string" ? longUrl.trim() : "";
    if (!cleanUrl) {
      throw new HttpsError("invalid-argument", "longUrl es requerido");
    }

    const hash = createHash("sha256").update(cleanUrl).digest("hex");
    const cacheRef = db.collection("short_links_cache").doc(hash);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const cached = cacheSnap.data();
      if (cached?.shortUrl) {
        return { shortUrl: cached.shortUrl };
      }
    }

    const res = await fetch("https://api.tinyurl.com/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYURL_API_TOKEN.value()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: cleanUrl,
        domain: domain || "tinyurl.com",
        alias: alias || undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new HttpsError(
        "internal",
        `TinyURL error ${res.status}: ${text?.slice(0, 200)}`
      );
    }

    const json = await res.json();
    const shortUrl =
      json?.data?.tiny_url ||
      json?.data?.short_url ||
      json?.tiny_url ||
      json?.short_url;

    if (!shortUrl) {
      throw new HttpsError("internal", "Respuesta TinyURL sin shortUrl");
    }

    await cacheRef.set({ longUrl: cleanUrl, shortUrl, createdAt: Date.now() });

    return { shortUrl };
  }
);
