import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from './auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
