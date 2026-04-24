import { adminApiClient } from "./adminApiClient";

export interface AdminUserInput {
  email: string;
  name: string;
  password?: string;
  sendInvite?: boolean;
}

export async function listAdminUsers() {
  const response = await adminApiClient.get("/users");
  return response.data;
}

export async function createAdminUser(payload: AdminUserInput) {
  const response = await adminApiClient.post("/users", payload);
  return response.data;
}

export async function updateAdminUser(
  id: string,
  payload: { name?: string; isActive?: boolean; resetPassword?: string }
) {
  const response = await adminApiClient.patch(`/users/${id}`, payload);
  return response.data;
}

export async function assignRolesToAdminUser(id: string, roleIds: string[]) {
  const response = await adminApiClient.post(`/users/${id}/roles`, { roleIds });
  return response.data;
}

export async function listRoles() {
  const response = await adminApiClient.get("/roles");
  return response.data;
}

export async function createRole(payload: { name: string; description?: string }) {
  const response = await adminApiClient.post("/roles", payload);
  return response.data;
}

export async function assignPermissionsToRole(id: string, permissionIds: string[]) {
  const response = await adminApiClient.post(`/roles/${id}/permissions`, { permissionIds });
  return response.data;
}

export async function listAuditLogs(limit = 100) {
  const response = await adminApiClient.get("/audit-logs", {
    params: { limit }
  });
  return response.data;
}
