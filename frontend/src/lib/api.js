const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Generate a stable-enough random id.
 * crypto.randomUUID is only available in secure contexts (https or localhost).
 * Fall back to a hex string for plain http.
 */
function randomKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  // Fallback: 32 hex chars (128 bits, same entropy as UUID v4)
  let s = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(16))
      : null;
  if (bytes) {
    for (let i = 0; i < bytes.length; i++) {
      s += bytes[i].toString(16).padStart(2, "0");
    }
    return s;
  }
  // Last-ditch fallback — non-crypto but fine for idempotency keys.
  return (
    Date.now().toString(16) + Math.random().toString(16).slice(2, 18)
  );
}

export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * POST/PATCH/PUT/DELETE helper.
 *
 * `options.idempotencyKey`
 *   Pass a stable key to make a POST safely retryable. If omitted, a fresh
 *   key is generated for POSTs (single-shot semantics).
 *
 * `options.token`
 *   Explicit bearer token. If omitted, no Authorization header is added.
 */
export async function apiSend(path, method, body, options = {}) {
  const { token, idempotencyKey } = options;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (method === "POST") {
    headers["X-Idempotency-Key"] = idempotencyKey || randomKey();
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${method} ${path} failed`);
  }
  return res.status === 204 ? null : res.json();
}

export { API_URL, randomKey };