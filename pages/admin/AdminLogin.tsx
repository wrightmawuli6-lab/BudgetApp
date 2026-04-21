import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminLogin, getAdminSession } from "../../adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminSession()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await adminLogin(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Login failed");
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">Budgeting</p>
        <h1 className="text-3xl font-black text-slate-900 mt-2">Admin Login</h1>
        <p className="text-sm text-slate-500 mt-2 font-semibold">Use admin credentials only.</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.12em] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.12em] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-semibold"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 text-white font-black py-3 disabled:opacity-60 hover:bg-emerald-500"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
