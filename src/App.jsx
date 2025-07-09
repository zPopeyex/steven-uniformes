import React, { useState } from "react";
import Inicio from "./pages/Inicio";
import Inventario from "./pages/Inventario";
import Stock from "./pages/Stock";

function App() {
  const [pagina, setPagina] = useState("inicio");

  return (
    <div style={{ padding: 20 }}>
      <h1>🧵 Steven Todo en Uniformes</h1>

      {/* Menú superior */}
      <div style={{ marginBottom: 30 }}>
        <button onClick={() => setPagina("inicio")} style={botonEstilo}>
          🏠 Inicio
        </button>
        <button onClick={() => setPagina("inventario")} style={botonEstilo}>
          ➕ Agregar Inventario
        </button>
        <button onClick={() => setPagina("stock")} style={botonEstilo}>
          📦 Ver Stock Actual
        </button>
      </div>

      {/* Contenido dinámico según la opción */}
      {pagina === "inicio" && <Inicio />}
      {pagina === "inventario" && <Inventario />}
      {pagina === "stock" && <Stock />}
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
