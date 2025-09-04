import { getFunctions, httpsCallable } from "firebase/functions";

export async function openShortInvoiceUrl(longUrl, opts = {}) {
  const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
  try {
    const functions = getFunctions(opts.app);
    const shorten = httpsCallable(functions, "shortenUrl");
    const { data } = await shorten({ longUrl });
    const shortUrl = data?.shortUrl || longUrl;

    if (popup) {
      popup.location = shortUrl;
    } else {
      window.location.assign(shortUrl);
    }
    return shortUrl;
  } catch (err) {
    console.error("Shorten error", err);
    if (popup) {
      popup.location = longUrl;
    } else {
      window.location.assign(longUrl);
    }
    return longUrl;
  }
}
