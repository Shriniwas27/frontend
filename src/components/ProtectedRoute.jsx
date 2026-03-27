import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../api';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
