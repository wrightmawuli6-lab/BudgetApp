import { apiClient } from "./services/apiClient";

const SESSION_KEY = "budgeting_session";
const TOKEN_KEY = "budgeting_auth_token";

export interface Session {
  id?: string;
  email: string;
  name: string;
}

function setSession(session: Session, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(TOKEN_KEY, token);
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  try {
    const response = await apiClient.post("/auth/register", {
      name,
      email,
      password,
      monthlyIncome: 0,
      studentType: "full-time"
    });

    const data = response.data;
    setSession(
      {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      },
      data.token
    );

    return { ok: true };
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    const detailMessage =
      Array.isArray(details) && details.length > 0
        ? details.map((d: { message?: string }) => d?.message).filter(Boolean).join(", ")
        : undefined;
    return {
      ok: false,
      error: detailMessage || error?.response?.data?.error?.message || "Registration failed"
    };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  try {
    const response = await apiClient.post("/auth/login", { email, password });
    const data = response.data;

    setSession(
      {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      },
      data.token
    );

    return { ok: true };
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    const detailMessage =
      Array.isArray(details) && details.length > 0
        ? details.map((d: { message?: string }) => d?.message).filter(Boolean).join(", ")
        : undefined;
    return {
      ok: false,
      error: detailMessage || error?.response?.data?.error?.message || "Login failed"
    };
  }
}
