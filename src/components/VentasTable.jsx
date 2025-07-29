import React, { useState } from "react";
import CardTable from "./CardTable"; // Ajusta la ruta

const VentasTable = ({ ventas, onActualizarEstado, totalVentas }) => {
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
    return (
      new Date(b.split("/").reverse().join("-")) -
      new Date(a.split("/").reverse().join("-"))
    );
  });

  // Alternar expansión de fecha
  const toggleExpandirFecha = (fecha) => {
    setFechasExpandidas((prev) => ({
      ...prev,
      [fecha]: !prev[fecha],
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
      <CardTable
        title="Ventas y encargos 💵"
        right={`Total: $${totalVentas.toLocaleString("es-CO")}`}
      >
        {totalVentas !== undefined && (
          <div
            style={{ marginBottom: 10, fontWeight: "bold", fontSize: "1.1em" }}
          ></div>
        )}
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
              const totalDia = ventasDelDia.reduce(
                (sum, v) => sum + v.precio * v.cantidad,
                0
              );
              const estaExpandida = fechasExpandidas[fecha];

              return (
                <React.Fragment key={fecha}>
                  <tr>
                    <td style={estiloCelda}>{fecha}</td>
                    <td style={estiloCelda}>
                      ${totalDia.toLocaleString("es-CO")}
                    </td>
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
                          gap: "5px",
                        }}
                      >
                        {estaExpandida ? "▼ Ocultar" : "▶ Mostrar"} detalles
                      </button>
                    </td>
                  </tr>

                  {estaExpandida &&
                    ventasDelDia.map((v, idx) => (
                      <tr key={v.id} style={{ backgroundColor: "#f9f9f9" }}>
                        <td style={estiloCelda} colSpan={3}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 32,
                              alignItems: "flex-start",
                              background: "#fff",
                              border: "1px solid #dde6fa",
                              borderRadius: 7,
                              boxShadow: "0 2px 6px #dbeafe33",
                              padding: "16px 18px",
                              marginBottom: 12,
                            }}
                          >
                            {/* Columna izquierda */}
                            <div
                              style={{ flex: 1, minWidth: 180, maxWidth: 260 }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1976d2",
                                  fontSize: "1.10em",
                                  marginBottom: 5,
                                }}
                              >
                                {v.prenda}
                              </div>
                              <div>
                                <b>Talla:</b> {v.talla}
                              </div>
                              <div
                                style={{
                                  fontWeight: 500,
                                  color: "#388e3c",
                                  fontSize: "1.09em",
                                  margin: "5px 0",
                                }}
                              >
                                <b>Precio Unit.:</b> $
                                {parseInt(v.precio).toLocaleString("es-CO")}
                              </div>
                              <div>
                                <b>Método Pago:</b> {v.metodoPago || "N/A"}
                              </div>
                              <div>
                                <b>Cliente:</b>{" "}
                                {typeof v.cliente === "string"
                                  ? v.cliente
                                  : v.cliente?.nombre || "N/A"}
                              </div>
                            </div>
                            {/* Columna derecha */}
                            <div
                              style={{ flex: 1, minWidth: 170, maxWidth: 260 }}
                            >
                              <div>
                                <b>Colegio:</b> {v.colegio}
                              </div>
                              <div>
                                <b>Cantidad:</b> {v.cantidad}
                              </div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#388e3c",
                                  fontSize: "1.09em",
                                  margin: "5px 0",
                                }}
                              >
                                Total: $
                                {parseInt(v.precio * v.cantidad).toLocaleString(
                                  "es-CO"
                                )}
                              </div>
                              <div>
                                <b>Estado:</b>{" "}
                                <span
                                  style={{ color: "#1976d2", fontWeight: 600 }}
                                >
                                  {v.estado || "venta"}
                                </span>
                                {v.estado === "separado" && (
                                  <button
                                    onClick={() => marcarComoPagado(v.id)}
                                    style={{
                                      marginLeft: "10px",
                                      padding: "3px 8px",
                                      backgroundColor: "#4CAF50",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Marcar como pagado
                                  </button>
                                )}
                              </div>
                              {v.estado === "separado" && (
                                <>
                                  <div>
                                    <b>Abono:</b> $
                                    {v.abono?.toLocaleString("es-CO") || "0"}
                                  </div>
                                  <div>
                                    <b>Saldo:</b> $
                                    {v.saldo?.toLocaleString("es-CO") || "0"}
                                  </div>
                                </>
                              )}
                              <div>
                                <b>Hora:</b> {formatearHora(v.fechaHora)}
                              </div>
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
      </CardTable>
    </div>
  );
};

export default VentasTable;
