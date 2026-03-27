import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="panel empty-state">Ładowanie konta...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  return children;
}
