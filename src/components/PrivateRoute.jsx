import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
