import React from "react";
import { Link, Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Inventario from "./pages/Inventario";
import Stock from "./pages/Stock";
import Catalogo from "./pages/Catalogo";
import Ventas from "./pages/Ventas";
import UserManagement from "./pages/UserManagement";
import { useAuth } from "./contexts/AuthContext.jsx";
import RoleRoute from "./components/RoleRoute.jsx";

function App() {
  const { role } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <h1>🧵 Steven Todo en Uniformes</h1>

      <nav style={{ marginBottom: 30 }}>
        <Link to="/" style={botonEstilo}>
          🏠 Inicio
        </Link>
        {role === "Admin" && (
          <>
            <Link to="/inventario" style={botonEstilo}>
              ➕ Agregar Inventario
            </Link>
            <Link to="/stock" style={botonEstilo}>
              📦 Ver Stock Actual
            </Link>
            <Link to="/ventas" style={botonEstilo}>
              💵 Ventas/Encargos
            </Link>
            <Link to="/catalogo" style={botonEstilo}>
              🛒 Catálogo de Productos
            </Link>
            <Link to="/usuarios" style={botonEstilo}>
              👥 Usuarios
            </Link>
          </>
        )}
        {role === "Vendedor" && (
          <Link to="/ventas" style={botonEstilo}>
            💵 Ventas/Encargos
          </Link>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route
          path="/inventario"
          element={
            <RoleRoute roles={["Admin"]}>
              <Inventario />
            </RoleRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <RoleRoute roles={["Admin"]}>
              <Stock />
            </RoleRoute>
          }
        />
        <Route path="/ventas" element={<Ventas />} />
        <Route
          path="/catalogo"
          element={
            <RoleRoute roles={["Admin"]}>
              <Catalogo />
            </RoleRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RoleRoute roles={["Admin"]}>
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
