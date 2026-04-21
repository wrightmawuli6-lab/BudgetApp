import React, { useEffect, useState } from "react";

import AdminLayout from "../../components/AdminLayout";
import { hasAdminPermission } from "../../adminAuth";
import { assignPermissionsToRole, createRole, listRoles } from "../../services/adminApi";

interface Permission {
  id: string;
  key: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export default function AdminRoles() {
  const canRead = hasAdminPermission("roles.read");
  const canWrite = hasAdminPermission("roles.write");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    if (!canRead) {
      return;
    }
    const result = await listRoles();
    setRoles(result.roles || []);
    setPermissions(result.permissions || []);
  };

  useEffect(() => {
    loadData().catch(() => setStatus("Failed to load roles"));
  }, []);

  const handleCreateRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite) {
      return;
    }
    try {
      await createRole({ name, description });
      setName("");
      setDescription("");
      setStatus("Role created");
      await loadData();
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Role create failed");
    }
  };

  const setAllPermissions = async (roleId: string) => {
    if (!canWrite) {
      return;
    }
    try {
      await assignPermissionsToRole(
        roleId,
        permissions.map((permission) => permission.id)
      );
      setStatus("Permissions assigned");
      await loadData();
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Permission update failed");
    }
  };

  return (
    <AdminLayout title="Roles & Permissions">
      {!canRead ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 font-semibold">
          Missing permission: roles.read
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Create Role</h2>
            <form onSubmit={handleCreateRole} className="grid gap-3 md:grid-cols-3 mt-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Role Name"
                className="border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                disabled={!canWrite}
                required
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description"
                className="border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                disabled={!canWrite}
              />
              <button
                type="submit"
                disabled={!canWrite}
                className="rounded-xl bg-emerald-600 text-white font-black py-2.5 disabled:opacity-50"
              >
                Create Role
              </button>
            </form>
            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="text-lg font-black text-slate-900 mb-3">Roles</h2>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Role</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Permissions</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold">{role.name}</td>
                    <td className="py-2">{role.description || "-"}</td>
                    <td className="py-2">{role.permissions?.map((permission) => permission.key).join(", ") || "-"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setAllPermissions(role.id)}
                        disabled={!canWrite}
                        className="px-3 py-1 rounded-lg border border-slate-300 font-semibold disabled:opacity-50"
                      >
                        Assign All Permissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
