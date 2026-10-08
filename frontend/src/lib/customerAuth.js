// Small helper to store and manage the customer JWT.
const ACCESS_KEY = "mrf_customer_token";
const REFRESH_KEY = "mrf_customer_refresh";

export function saveCustomerTokens(access, refresh) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function getCustomerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getCustomerRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearCustomerTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isCustomerLoggedIn() {
  return !!getCustomerToken();
}

// Fetch wrapper that injects the customer Bearer token
export async function customerFetch(url, options = {}) {
  const token = getCustomerToken();
  const headers = {
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...options, headers });
}