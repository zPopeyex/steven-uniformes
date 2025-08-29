import React, { useState } from "react";
import CardTable from "./CardTable"; // Ajusta la ruta

const VentasTable = ({ ventas, onActualizarEstado, totalVentas, role }) => {
  const [fechasExpandidas, setFechasExpandidas] = useState({});

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
    <div className="resumen-ventas">
      <CardTable
        title={
          <>
            <i className="fa-solid fa-chart-line" /> Resumen de Ventas
          </>
        }
      >
        {totalVentas !== undefined && (
          <div style={{ marginBottom: 10, fontWeight: 600 }}>
            Total: ${totalVentas.toLocaleString("es-CO")}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Total del Día</th>
              <th>Acciones</th>
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
                    <td>{fecha}</td>
                    <td>${totalDia.toLocaleString("es-CO")}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        onClick={() => toggleExpandirFecha(fecha)}
                        aria-label={
                          estaExpandida
                            ? "Ocultar detalles"
                            : "Mostrar detalles"
                        }
                      >
                        <i
                          className={`fa-solid ${
                            estaExpandida ? "fa-caret-down" : "fa-caret-right"
                          }`}
                        />
                        Mostrar detalles
                      </button>
                    </td>
                  </tr>

                  {estaExpandida &&
                    ventasDelDia.map((v) => (
                      <tr key={v.id}>
                        <td colSpan={3}>
                          <div className="venta-detail">
                            <div className="grid">
                              {/* Columna izquierda */}
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: "#1976d2",
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
                              <div>
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
                                    margin: "5px 0",
                                  }}
                                >
                                  Total: $
                                  {parseInt(
                                    v.precio * v.cantidad
                                  ).toLocaleString("es-CO")}
                                </div>
                                <div>
                                  <b>Estado:</b>{" "}
                                  <span
                                    style={{
                                      color: "#1976d2",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {v.estado || "venta"}
                                  </span>
                                  {v.estado === "separado" &&
                                    role === "Admin" && (
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
