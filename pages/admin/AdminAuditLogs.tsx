import React, { useEffect, useState } from "react";

import AdminLayout from "../../components/AdminLayout";
import { hasAdminPermission } from "../../adminAuth";
import { listAuditLogs } from "../../services/adminApi";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_email: string | null;
  ip: string | null;
  created_at: string;
}

export default function AdminAuditLogs() {
  const canRead = hasAdminPermission("audit.read");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canRead) {
      return;
    }
    listAuditLogs(100)
      .then((result) => setLogs(result.logs || []))
      .catch(() => setError("Failed to load audit logs"));
  }, []);

  return (
    <AdminLayout title="Audit Logs">
      {!canRead ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 font-semibold">
          Missing permission: audit.read
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
          <h2 className="text-lg font-black text-slate-900 mb-3">Recent Actions</h2>
          {error && <p className="text-sm text-rose-700 font-semibold mb-3">{error}</p>}
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">When</th>
                <th className="py-2">Actor</th>
                <th className="py-2">Action</th>
                <th className="py-2">Entity</th>
                <th className="py-2">Entity ID</th>
                <th className="py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="py-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2">{log.actor_email || "system"}</td>
                  <td className="py-2 font-semibold">{log.action}</td>
                  <td className="py-2">{log.entity_type}</td>
                  <td className="py-2">{log.entity_id || "-"}</td>
                  <td className="py-2">{log.ip || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminLayout>
  );
}
