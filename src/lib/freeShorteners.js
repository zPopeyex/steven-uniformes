// Lightweight JSONP helper to bypass CORS for public shortener APIs
function jsonpRequest(src, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const cb = `__jsonp_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const cleanup = () => {
      try { delete window[cb]; } catch {}
      if (script && script.parentNode) script.parentNode.removeChild(script);
      if (timer) clearTimeout(timer);
    };

    let script;
    let timer;

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    const url = src + (src.includes("?") ? "&" : "?") + "callback=" + cb;

    script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP script error"));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeout);

    document.head.appendChild(script);
  });
}

async function shortenWithIsGd(longUrl) {
  const base = "https://is.gd/create.php";
  const src = `${base}?format=json&url=${encodeURIComponent(longUrl)}&logstats=1`;
  const res = await jsonpRequest(src);
  if (res && res.shorturl) return res.shorturl;
  if (res && res.errormessage) throw new Error(res.errormessage);
  throw new Error("is.gd unknown response");
}

async function shortenWithVGd(longUrl) {
  const base = "https://v.gd/create.php";
  const src = `${base}?format=json&url=${encodeURIComponent(longUrl)}&logstats=1`;
  const res = await jsonpRequest(src);
  if (res && res.shorturl) return res.shorturl;
  if (res && res.errormessage) throw new Error(res.errormessage);
  throw new Error("v.gd unknown response");
}

export async function shortenUrlFree(longUrl) {
  try {
    return await shortenWithIsGd(longUrl);
  } catch (e1) {
    try {
      return await shortenWithVGd(longUrl);
    } catch (e2) {
      // Return original to not block UX
      return longUrl;
    }
  }
}

