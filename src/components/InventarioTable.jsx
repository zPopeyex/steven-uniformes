// 📄 src/components/InventarioTable.jsx

import React from "react";

const InventarioTable = ({ productos = [], onEliminar }) => {
  const convertirFecha = (fechaHora) => {
    if (!fechaHora || !fechaHora.seconds) return "-";
    const date = new Date(fechaHora.seconds * 1000);
    return date.toLocaleDateString("es-CO");
  };

  const convertirHora = (fechaHora) => {
    if (!fechaHora || !fechaHora.seconds) return "-";
    const date = new Date(fechaHora.seconds * 1000);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div style={{ overflowX: "auto", marginTop: 20 }}>
      <table
        style={{
          border: "1px solid #ddd",
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
                      <th>Nombre Plantel</th>
          <th>Producto</th>
          <th>Talla</th>
          <th>Cantidad</th>
          <th>Vr. Unitario</th>
          <th>Vr. Total</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, index) => {
            const cantidad = parseInt(p.cantidad || 0);
            const precio = parseInt(p.precio || 0);
            const total = precio * cantidad;

            return (
              <tr key={index}>
                <td style={estiloCelda}>{p.colegio}</td>
                <td style={estiloCelda}>{p.prenda}</td>
                <td style={estiloCelda}>{p.talla}</td>
                <td style={estiloCelda}>{cantidad}</td>
                <td style={estiloCelda}>{precio.toLocaleString("es-CO")}</td>
                <td style={estiloCelda}>{total.toLocaleString("es-CO")}</td>
                <td style={estiloCelda}>{convertirFecha(p.fechaHora)}</td>
                <td style={estiloCelda}>{convertirHora(p.fechaHora)}</td>

                <td style={estiloCelda}>
                  <button
                    onClick={() => onEliminar(p.id)}
                    style={{
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const estiloEncabezado = {
  padding: "10px",
  backgroundColor: "#f4f4f4",
  border: "1px solid #ddd",
  fontWeight: "bold",
};

const estiloCelda = {
  padding: "10px",
  border: "1px solid #ddd",
};

export default InventarioTable;
