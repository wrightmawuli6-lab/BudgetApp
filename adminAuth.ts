import { adminApiClient } from "./services/adminApiClient";

const ADMIN_SESSION_KEY = "budgeting_admin_session";
const ADMIN_TOKEN_KEY = "budgeting_admin_auth_token";

export interface AdminSession {
  admin: {
    id: string;
    email: string;
    name: string;
    is_active: boolean;
  };
  roles: string[];
  permissions: string[];
}

function persistAdminSession(session: AdminSession, token: string) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function hasAdminPermission(permissionKey: string): boolean {
  const session = getAdminSession();
  if (!session) {
    return false;
  }

  return session.permissions.includes("*") || session.permissions.includes(permissionKey);
}

export async function adminLogin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await adminApiClient.post("/auth/login", { email, password });
    const data = response.data as { token: string } & AdminSession;
    persistAdminSession(
      {
        admin: data.admin,
        roles: data.roles,
        permissions: data.permissions
      },
      data.token
    );
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.response?.data?.error?.message || "Admin login failed" };
  }
}

export async function adminLogout() {
  try {
    await adminApiClient.post("/auth/logout");
  } catch {
    // Ignore logout network failures.
  } finally {
    clearAdminSession();
  }
}

export async function refreshAdminSession() {
  const token = getAdminToken();
  if (!token) {
    clearAdminSession();
    return null;
  }

  try {
    const response = await adminApiClient.get("/auth/me");
    const data = response.data as AdminSession;
    persistAdminSession(data, token);
    return data;
  } catch {
    clearAdminSession();
    return null;
  }
}
