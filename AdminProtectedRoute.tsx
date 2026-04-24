import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAdminSession, refreshAdminSession } from "./adminAuth";

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      const session = getAdminSession();
      if (session) {
        setAuthenticated(true);
      }

      const refreshed = await refreshAdminSession();
      if (!mounted) {
        return;
      }
      setAuthenticated(Boolean(refreshed || session));
      setLoading(false);
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 font-bold">Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
