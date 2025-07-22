// VentasTable.jsx
import React from "react";

const VentasTable = ({ ventas }) => {
  // Estilos (mantener los existentes)
  const estiloEncabezado = {
    padding: "10px",
    backgroundColor: "#f4f4f4",
    border: "1px solid #ddd",
    fontWeight: "bold",
    textAlign: "left",
  };

  const estiloCelda = {
    padding: "10px",
    border: "1px solid #ddd",
    textAlign: "left",
  };

  // Función para extraer fecha formateada
  const formatearFecha = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Función para extraer hora formateada
  const formatearHora = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Ordenar por fecha/hora (más reciente primero) - Versión mejorada
  const ventasOrdenadas = [...ventas].sort((a, b) => {
    // Si no tienen fechaHora, las ponemos al final
    if (!a.fechaHora?.seconds && !b.fechaHora?.seconds) return 0;
    if (!a.fechaHora?.seconds) return 1;
    if (!b.fechaHora?.seconds) return -1;
    
    // Comparación por timestamp
    return b.fechaHora.seconds - a.fechaHora.seconds || 
           b.fechaHora.nanoseconds - a.fechaHora.nanoseconds;
  });

  return (
    <div style={{ overflowX: "auto", marginTop: 20 }}>
      <table
        style={{
          border: "1px solid #ddd",
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr>
            <th style={estiloEncabezado}>Cantidad</th>
            <th style={estiloEncabezado}>Producto</th>
            <th style={estiloEncabezado}>Colegio</th>
            <th style={estiloEncabezado}>Talla</th>
            <th style={estiloEncabezado}>Precio Unit.</th>
            <th style={estiloEncabezado}>Total</th>
            <th style={estiloEncabezado}>Método Pago</th>
            <th style={estiloEncabezado}>Estado</th>
            <th style={estiloEncabezado}>Fecha</th>
            <th style={estiloEncabezado}>Hora</th>
          </tr>
        </thead>
        <tbody>
          {ventasOrdenadas.map((v) => (
            <tr key={v.id}>
              <td style={estiloCelda}>{v.cantidad}</td>
              <td style={estiloCelda}>{v.prenda}</td>
              <td style={estiloCelda}>{v.colegio}</td>
              <td style={estiloCelda}>{v.talla}</td>
              <td style={estiloCelda}>
                ${(v.precio || 0).toLocaleString("es-CO")}
              </td>
              <td style={estiloCelda}>
                ${(v.precio * v.cantidad).toLocaleString("es-CO")}
              </td>
              <td style={estiloCelda}>{v.metodoPago}</td>
              <td style={estiloCelda}>{v.estado}</td>
              <td style={estiloCelda}>{formatearFecha(v.fechaHora)}</td>
              <td style={estiloCelda}>{formatearHora(v.fechaHora)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VentasTable;