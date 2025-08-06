import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const RoleRoute = ({ roles, children }) => {
  const { role } = useAuth();

  if (role === null) return null;
  return roles.includes(role) ? children : <Navigate to="/" replace />;
};

export default RoleRoute;
