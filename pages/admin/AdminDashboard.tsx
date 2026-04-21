import React from "react";

import AdminLayout from "../../components/AdminLayout";
import { getAdminSession, hasAdminPermission } from "../../adminAuth";

export default function AdminDashboard() {
  const session = getAdminSession();

  return (
    <AdminLayout title="Dashboard">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Welcome, {session?.admin.name}</h2>
        <p className="mt-2 text-slate-600 font-semibold">
          This is the admin control center. Use the navigation tabs to manage admins, roles, and audit logs.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-black">Roles</p>
            <p className="text-sm mt-1 font-semibold text-slate-900">{session?.roles.join(", ") || "None"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-black">Permissions</p>
            <p className="text-sm mt-1 font-semibold text-slate-900">
              {session?.permissions.includes("*")
                ? "All permissions (SUPER_ADMIN)"
                : session?.permissions.join(", ") || "None"}
            </p>
          </div>
        </div>
        {!hasAdminPermission("audit.read") && (
          <p className="mt-4 text-sm text-amber-700 font-semibold">
            Your account does not currently have `audit.read`. Some pages are intentionally hidden.
          </p>
        )}
      </section>
    </AdminLayout>
  );
}
