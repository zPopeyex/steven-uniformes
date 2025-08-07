import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const RoleRoute = ({ roles, requiredPermissions, children }) => {
  const { role, permissions } = useAuth();

  if (role === null) return null;
  const hasRole = roles ? roles.includes(role) : true;
  const hasPermission = requiredPermissions
    ? requiredPermissions.some((p) => permissions.includes(p))
    : true;
  return hasRole && hasPermission ? children : <Navigate to="/" replace />;
};

export default RoleRoute;
