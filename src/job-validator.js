import fetch from "node-fetch";

export const DEFAULT_EXPIRED_KEYWORDS = [
  "no longer accepting",
  "position has been filled",
  "job is no longer available",
  "this job has expired",
  "position is no longer open",
  "application deadline has passed",
  "this posting has been closed",
];

/**
 * HEAD-only check — fast, no body download.
 * Returns { ok, status } where ok = status 200–399.
 */
export async function validateByHead(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

/**
 * Full GET check — downloads body and looks for expired keywords.
 * Returns { ok, status, expired } where expired = true if body contains
 * any keyword from DEFAULT_EXPIRED_KEYWORDS.
 */
export async function validateByContent(url, { keywords = DEFAULT_EXPIRED_KEYWORDS } = {}) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, status: res.status, expired: false };

    const html = await res.text();
    const lower = html.toLowerCase();
    const expired = keywords.some((kw) => lower.includes(kw));
    return { ok: true, status: res.status, expired };
  } catch (e) {
    return { ok: false, status: 0, expired: false, error: e.message };
  }
}
