// 📄 src/components/InventarioTable.jsx

import React from "react";

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

  const filas = [...productos].sort((a, b) => {
    if (!a.fechaHora?.seconds) return 1;
    if (!b.fechaHora?.seconds) return -1;
    return b.fechaHora.seconds - a.fechaHora.seconds;
  });

  return (
    <table className="st-inv-table">
      <thead>
        <tr>
          <th>Plantel</th>
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
        {filas.length === 0 ? (
          <tr>
            <td
              colSpan={role === "Admin" ? 9 : 8}
              style={{ textAlign: "center", padding: "12px", color: "#666" }}
            >
              Sin resultados
            </td>
          </tr>
        ) : (
          filas.map((p, index) => {
            const cantidad = parseInt(p.cantidad || 0);
            const precio = parseInt(p.precio || 0);
            const total = precio * cantidad;

            return (
              <tr key={index}>
                <td>{p.colegio}</td>
                <td>{p.prenda}</td>
                <td>{p.talla}</td>
                <td>{cantidad}</td>
                <td>{precio.toLocaleString("es-CO")}</td>
                <td>{total.toLocaleString("es-CO")}</td>
                <td>{convertirFecha(p.fechaHora)}</td>
                <td>{convertirHora(p.fechaHora)}</td>
                {role === "Admin" && (
                  <td>
                    <button
                      type="button"
                      className="st-inv-btn-delete"
                      onClick={() => onEliminar(p.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export default InventarioTable;
