import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const TINYURL_API_TOKEN = defineSecret("TINYURL_API_TOKEN");

export const shortenUrl = onCall(
  { region: "us-central1", secrets: [TINYURL_API_TOKEN], cors: true },
  async (req) => {
    const { longUrl, alias, domain } = req.data || {};
    if (!longUrl || typeof longUrl !== "string") {
      throw new HttpsError("invalid-argument", "longUrl es requerido");
    }

    const res = await fetch("https://api.tinyurl.com/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYURL_API_TOKEN.value()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: longUrl,
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

    return { shortUrl };
  }
);
