import React, { useEffect, useState } from "react";

import AdminLayout from "../../components/AdminLayout";
import { hasAdminPermission } from "../../adminAuth";
import {
  assignRolesToAdminUser,
  createAdminUser,
  listAdminUsers,
  listRoles,
  updateAdminUser
} from "../../services/adminApi";

interface RoleItem {
  id: string;
  name: string;
}

interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  roles: RoleItem[];
}

interface AppUserItem {
  id: string;
  email: string;
  name: string;
  created_at: string;
  monthly_income: number | null;
  student_type: string | null;
  debt_amount: number | null;
}

export default function AdminUsers() {
  const canRead = hasAdminPermission("users.read");
  const canWrite = hasAdminPermission("users.write");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!canRead) {
      return;
    }
    const [usersData, rolesData] = await Promise.all([listAdminUsers(), listRoles()]);
    setUsers(usersData.adminUsers || usersData.users || []);
    setAppUsers(usersData.appUsers || []);
    setRoles(rolesData.roles || []);
  };

  useEffect(() => {
    loadData().catch(() => setStatus("Failed to load admin users"));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const result = await createAdminUser({ email, name, sendInvite: true });
      setStatus(
        result.temporaryPassword
          ? `Created. Temporary password: ${result.temporaryPassword}`
          : "Admin user created."
      );
      setEmail("");
      setName("");
      await loadData();
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (user: AdminUserItem) => {
    if (!canWrite) {
      return;
    }
    try {
      await updateAdminUser(user.id, { isActive: !user.is_active });
      await loadData();
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Update failed");
    }
  };

  const assignFirstRole = async (user: AdminUserItem) => {
    if (!canWrite || roles.length === 0) {
      return;
    }
    try {
      await assignRolesToAdminUser(user.id, [roles[0].id]);
      await loadData();
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Role assignment failed");
    }
  };

  const resetPassword = async (user: AdminUserItem) => {
    if (!canWrite) {
      return;
    }
    const password = window.prompt(`Enter a new password for ${user.email}:`);
    if (!password) {
      return;
    }
    try {
      await updateAdminUser(user.id, { resetPassword: password });
      setStatus(`Password reset for ${user.email}`);
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || "Password reset failed");
    }
  };

  return (
    <AdminLayout title="Admin Users">
      {!canRead ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 font-semibold">
          Missing permission: users.read
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Create / Invite Admin</h2>
            <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                disabled={!canWrite || loading}
                required
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                disabled={!canWrite || loading}
                required
              />
              <button
                type="submit"
                disabled={!canWrite || loading}
                className="rounded-xl bg-emerald-600 text-white font-black py-2.5 disabled:opacity-50"
              >
                Create User
              </button>
            </form>
            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="text-lg font-black text-slate-900 mb-3">Admin User List</h2>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Roles</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold">{user.name}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.is_active ? "Active" : "Inactive"}</td>
                    <td className="py-2">{user.roles?.map((role) => role.name).join(", ") || "-"}</td>
                    <td className="py-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        disabled={!canWrite}
                        className="px-3 py-1 rounded-lg border border-slate-300 font-semibold disabled:opacity-50"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => assignFirstRole(user)}
                        disabled={!canWrite || roles.length === 0}
                        className="px-3 py-1 rounded-lg border border-slate-300 font-semibold disabled:opacity-50"
                      >
                        Assign {roles[0]?.name || "Role"}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetPassword(user)}
                        disabled={!canWrite}
                        className="px-3 py-1 rounded-lg border border-slate-300 font-semibold disabled:opacity-50"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="text-lg font-black text-slate-900 mb-3">Registered App Users</h2>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Student Type</th>
                  <th className="py-2">Monthly Income</th>
                  <th className="py-2">Debt</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {appUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold">{user.name}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.student_type || "-"}</td>
                    <td className="py-2">{user.monthly_income ?? "-"}</td>
                    <td className="py-2">{user.debt_amount ?? "-"}</td>
                    <td className="py-2">{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {appUsers.length === 0 && (
                  <tr>
                    <td className="py-3 text-slate-500" colSpan={6}>
                      No registered app users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
