import React, { useState } from "react";
import { useAuth } from "./contexts/AuthContext.jsx";
import Inicio from "./pages/Inicio";
import Inventario from "./pages/Inventario";
import Stock from "./pages/Stock";
import Catalogo from "./pages/Catalogo";
import Ventas from "./pages/Ventas";
import UserManagement from "./pages/UserManagement";

function App() {
  const [pagina, setPagina] = useState("inicio");
  const { role, hasRole } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <h1>🧵 Steven Todo en Uniformes</h1>

      <div style={{ marginBottom: 20 }}>
        <strong>Rol:</strong> {role || "sin asignar"}
      </div>

      {/* Menú superior */}
      <div style={{ marginBottom: 30 }}>
        <button onClick={() => setPagina("inicio")} style={botonEstilo}>
          🏠 Inicio
        </button>
        {hasRole("admin") && (
          <button onClick={() => setPagina("inventario")} style={botonEstilo}>
            ➕ Agregar Inventario
          </button>
        )}
        <button onClick={() => setPagina("stock")} style={botonEstilo}>
          📦 Ver Stock Actual
        </button>
        <button onClick={() => setPagina("ventas")} style={botonEstilo}>
          💵 Ventas/Encargos
        </button>
        <button onClick={() => setPagina("catalogo")} style={botonEstilo}>
          🛒 Catálogo de Productos
        </button>
        {hasRole("admin") && (
          <button onClick={() => setPagina("usuarios")} style={botonEstilo}>
            👥 Usuarios
          </button>
        )}
      </div>

      {/* Contenido dinámico según la opción */}
      {pagina === "inicio" && <Inicio />}
      {pagina === "inventario" && <Inventario />}
      {pagina === "stock" && <Stock />}
      {pagina === "catalogo" && <Catalogo />}
      {pagina === "ventas" && <Ventas />}
      {pagina === "usuarios" && hasRole("admin") && <UserManagement />}
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
