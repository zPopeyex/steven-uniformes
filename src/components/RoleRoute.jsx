import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const RoleRoute = ({ roles, requiredPermissions, requiredPerm, requiredPerms, children }) => {
  const { role, permisos, permissions } = useAuth();

  if (role === null) return null;
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const hasRole = roles ? roles.includes(role) : true;

  // Normalize required keys from any prop name (back-compat)
  const req = requiredPerm
    ? [requiredPerm]
    : requiredPerms
    ? requiredPerms
    : requiredPermissions
    ? requiredPermissions
    : [];

  const checkPermObj = (keys) => keys.every((k) => permisos?.[k]);
  const checkLegacy = (keys) => keys.every((k) => permissions?.includes(k));

  const hasPermission = req.length === 0 || isAdmin || checkPermObj(req) || checkLegacy(req);
  return hasRole && hasPermission ? children : <Navigate to="/" replace />;
};

export default RoleRoute;
