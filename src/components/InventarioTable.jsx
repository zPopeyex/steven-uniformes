// 📄 src/components/InventarioTable.jsx

import React from "react";
import CardTable from './CardTable'; // Ajusta la ruta

const InventarioTable = ({ productos = [], onEliminar, role }) => {
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
      <CardTable
  title="Historial de ingreso de inventario 📦"
  right={productos.length + " productos"}
>
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
          {role === "Admin" && <th>Acciones</th>}
          </tr>
        </thead>
<tbody>
  {[...productos]
    .sort((a, b) => {
      // Si alguno no tiene fecha, lo manda abajo
      if (!a.fechaHora?.seconds) return 1;
      if (!b.fechaHora?.seconds) return -1;
      return b.fechaHora.seconds - a.fechaHora.seconds;
    })
    .map((p, index) => {
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
          {role === "Admin" && (
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
          )}
        </tr>
      );
    })}
</tbody>

      </table>
      </CardTable>
    </div>
  );
};

const estiloCelda = {
  padding: "10px",
  border: "1px solid #ddd",
};

export default InventarioTable;
