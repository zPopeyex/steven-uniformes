import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLoading } from "../context/LoadingContext.jsx";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    if (loading) {
      showLoading();
    } else {
      hideLoading();
    }
  }, [loading, showLoading, hideLoading]);

  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
