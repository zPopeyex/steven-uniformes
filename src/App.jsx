import React from "react";
import { Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Inventario from "./pages/Inventario";
import Stock from "./pages/Stock";
import Catalogo from "./pages/Catalogo";
import VentasEncargos from "./pages/VentasEncargos";
import UserManagement from "./pages/UserManagement";
import { useAuth } from "./context/AuthContext.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";

function App() {
  const { user, role, logout, name } = useAuth();
  if (role === null) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginBottom: "20px",
            }}
          >
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="avatar"
                style={{ width: 32, height: 32, borderRadius: "50%" }}
              />
            )}
            <span style={{ fontWeight: 600 }}>
              Bienvenido, {name || user.displayName || user.email} ({role})
            </span>
            <button onClick={logout} style={botonEstilo}>
              Cerrar sesión
            </button>
          </div>
        )}
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
                <VentasEncargos />
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
      </main>
    </div>
  );
}

const botonEstilo = {
  marginRight: "10px",
  padding: "10px 15px",
  backgroundColor: "#0052cc",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default App;
