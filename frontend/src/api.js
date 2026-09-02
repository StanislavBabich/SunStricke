const API_BASE = "http://localhost:8080/api";
const TOKEN_KEY = "sunstrike_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export async function registerUser(login, email, password) {
  const data = await request("/register", {
    method: "POST",
    body: JSON.stringify({ login, email, password })
  });
  if (data.token) saveToken(data.token);
  return data;
}

export async function loginUser(email, password) {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (data.token) saveToken(data.token);
  return data;
}

export async function logoutUser() {
  await request("/logout", { method: "POST" });
  clearToken();
}

export function forceLogoutLocal() {
  clearToken();
}

export async function getCurrentUser() {
  return request("/me", { method: "GET" });
}

export async function updateProfile(payload) {
  return request("/profile", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
