import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://192.168.139.159:8000";

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    const err = new Error(
      `Cannot reach server at ${API_URL}. Check your network.`
    );
    err.status = 0;
    throw err;
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.detail || `${method} ${path} failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Auth ----------

export async function login(email, password) {
  return request("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function getMe(token) {
  return request("/api/v1/auth/me", { token });
}

// ---------- Rider ----------

export async function getMyDeliveries(token) {
  return request("/api/v1/riders/mine", { token });
}

export async function getHistory(token) {
  return request("/api/v1/riders/mine?include_delivered=true", { token });
}

export async function getAssignable(token) {
  return request("/api/v1/riders/assignable", { token });
}

export async function claimOrder(token, orderId) {
  return request(`/api/v1/riders/claim/${orderId}`, {
    method: "POST",
    token,
  });
}

export async function updateOrderStatus(token, orderId, status) {
  return request(`/api/v1/riders/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export { API_URL };