import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { adminLogout, getAdminSession, hasAdminPermission } from "../adminAuth";

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

const navItems = [
  { to: "/admin", label: "Dashboard", permission: null },
  { to: "/admin/users", label: "Admin Users", permission: "users.read" },
  { to: "/admin/roles", label: "Roles", permission: "roles.read" },
  { to: "/admin/audit-logs", label: "Audit Logs", permission: "audit.read" }
];

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getAdminSession();

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black">Admin Portal</p>
              <h1 className="text-2xl font-black text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500 font-semibold mt-1">{session?.admin.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="self-start md:self-auto px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-700 transition-colors"
            >
              Logout
            </button>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2">
            {navItems
              .filter((item) => !item.permission || hasAdminPermission(item.permission))
              .map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
