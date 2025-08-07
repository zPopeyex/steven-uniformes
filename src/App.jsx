import React from "react";
import { Link, Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Inventario from "./pages/Inventario";
import Stock from "./pages/Stock";
import Catalogo from "./pages/Catalogo";
import Ventas from "./pages/Ventas";
import UserManagement from "./pages/UserManagement";
import { useAuth } from "./context/AuthContext.jsx";
import RoleRoute from "./components/RoleRoute.jsx";

function App() {
  const { user, role, permissions, logout, nickname } = useAuth();
  if (role === null) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>🧵 Steven Todo en Uniformes</h1>
        {user && (
          <div>
            <span style={{ marginRight: 10 }}>
              {user.displayName || user.email} ({role}
              {nickname ? ` - ${nickname}` : ""})
            </span>
            <button onClick={logout} style={botonEstilo}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <nav style={{ marginBottom: 30 }}>
        <Link to="/" style={botonEstilo}>
          🏠 Inicio
        </Link>
        {permissions.includes("inventario") && (
          <Link to="/inventario" style={botonEstilo}>
            ➕ Agregar Inventario
          </Link>
        )}
        {permissions.includes("stock") && (
          <Link to="/stock" style={botonEstilo}>
            📦 Ver Stock Actual
          </Link>
        )}
        {permissions.includes("ventas") && (
          <Link to="/ventas" style={botonEstilo}>
            💵 Ventas/Encargos
          </Link>
        )}
        {permissions.includes("catalogo") && (
          <Link to="/catalogo" style={botonEstilo}>
            🛒 Catálogo de Productos
          </Link>
        )}
        {permissions.includes("usuarios") && (
          <Link to="/usuarios" style={botonEstilo}>
            👥 Usuarios
          </Link>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route
          path="/inventario"
          element={
            <RoleRoute requiredPermissions={["inventario"]}>
              <Inventario />
            </RoleRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <RoleRoute requiredPermissions={["stock"]}>
              <Stock />
            </RoleRoute>
          }
        />
        <Route
          path="/ventas"
          element={
            <RoleRoute requiredPermissions={["ventas"]}>
              <Ventas />
            </RoleRoute>
          }
        />
        <Route
          path="/catalogo"
          element={
            <RoleRoute requiredPermissions={["catalogo"]}>
              <Catalogo />
            </RoleRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RoleRoute requiredPermissions={["usuarios"]}>
              <UserManagement />
            </RoleRoute>
          }
        />
      </Routes>
    </div>
  );
}

const botonEstilo = {
  marginRight: "10px",
  padding: "10px 15px",
  backgroundColor: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default App;
