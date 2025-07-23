import React, { useState } from "react";

const VentasTable = ({ ventas, onActualizarEstado }) => {
  const [fechasExpandidas, setFechasExpandidas] = useState({});
  
  // Estilos
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

  // Agrupar ventas por fecha
  const ventasPorFecha = ventas.reduce((acc, venta) => {
    const fecha = formatearFecha(venta.fechaHora);
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(venta);
    return acc;
  }, {});

  // Ordenar fechas (más reciente primero)
  const fechasOrdenadas = Object.keys(ventasPorFecha).sort((a, b) => {
    return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
  });

  // Alternar expansión de fecha
  const toggleExpandirFecha = (fecha) => {
    setFechasExpandidas(prev => ({
      ...prev,
      [fecha]: !prev[fecha]
    }));
  };

  // Función para marcar separado como pagado
  const marcarComoPagado = (id) => {
    if (confirm("¿Marcar este separado como pagado?")) {
      onActualizarEstado(id, "venta");
    }
  };

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
            <th style={estiloEncabezado}>Fecha</th>
            <th style={estiloEncabezado}>Total del Día</th>
            <th style={estiloEncabezado}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {fechasOrdenadas.map((fecha) => {
            const ventasDelDia = ventasPorFecha[fecha];
            const totalDia = ventasDelDia.reduce((sum, v) => sum + (v.precio * v.cantidad), 0);
            const estaExpandida = fechasExpandidas[fecha];

            return (
              <React.Fragment key={fecha}>
                <tr>
                  <td style={estiloCelda}>{fecha}</td>
                  <td style={estiloCelda}>${totalDia.toLocaleString("es-CO")}</td>
                  <td style={estiloCelda}>
                    <button 
                      onClick={() => toggleExpandirFecha(fecha)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      {estaExpandida ? "▼ Ocultar" : "▶ Mostrar"} detalles
                    </button>
                  </td>
                </tr>
                
                {estaExpandida && ventasDelDia.map((v) => (
                  <tr key={v.id} style={{ backgroundColor: "#f9f9f9" }}>
                    <td style={estiloCelda}></td>
                    <td style={estiloCelda} colSpan="2">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                        <div>
                          <strong>Producto:</strong> {v.prenda}
                        </div>
                        <div>
                          <strong>Colegio:</strong> {v.colegio}
                        </div>
                        <div>
                          <strong>Talla:</strong> {v.talla}
                        </div>
                        <div>
                          <strong>Cantidad:</strong> {v.cantidad}
                        </div>
                        <div>
                          <strong>Precio Unit.:</strong> ${(v.precio || 0).toLocaleString("es-CO")}
                        </div>
                        <div>
                          <strong>Total:</strong> ${(v.precio * v.cantidad).toLocaleString("es-CO")}
                        </div>
                        <div>
                          <strong>Método Pago:</strong> {v.metodoPago}
                        </div>
                        <div>
                          <strong>Estado:</strong> {v.estado}
                          {v.estado === "separado" && (
                            <button 
                              onClick={() => marcarComoPagado(v.id)}
                              style={{
                                marginLeft: "10px",
                                padding: "3px 6px",
                                backgroundColor: "#4CAF50",
                                color: "white",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer"
                              }}
                            >
                              Marcar como pagado
                            </button>
                          )}
                        </div>
                        <div>
                          <strong>Cliente:</strong> {v.cliente || "N/A"}
                        </div>
                        {v.estado === "separado" && (
                          <>
                            <div>
                              <strong>Abono:</strong> ${v.abono?.toLocaleString("es-CO") || "0"}
                            </div>
                            <div>
                              <strong>Saldo:</strong> ${v.saldo?.toLocaleString("es-CO") || "0"}
                            </div>
                          </>
                        )}
                        <div>
                          <strong>Hora:</strong> {formatearHora(v.fechaHora)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VentasTable;