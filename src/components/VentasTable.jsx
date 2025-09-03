import React, { useState } from "react";
import CardTable from "./CardTable"; // Ajusta la ruta

const VentasTable = ({ ventas, onActualizarEstado, totalVentas, role }) => {
  const [fechasExpandidas, setFechasExpandidas] = useState({});
  const SHOW_DETAILS_AS_TABLE = true; // usar tabla en lugar de cards

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
  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case "venta":
        return "badge badge-paid";
      case "separado":
        return "badge badge-pending";
      case "encargo":
        return "badge badge-warning";
      default:
        return "badge badge-default";
    }
  };
  const getEstadoText = (estado) => {
    switch (estado) {
      case "venta":
        return "Venta";
      case "separado":
        return "Separado";
      case "encargo":
        return "Encargo";
      default:
        return "N/A";
    }
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

                  {estaExpandida && (
                    <tr className="expanded-details">
                      <td colSpan="3">
                        <div className="details-container">
                          {true ? ( // 🔄 Cambia a false si quieres volver a cards
                            <div className="table-wrapper">
                              <table className="ventas-detalle-table">
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th>Talla</th>
                                    <th>Cant.</th>
                                    <th>P. Unit.</th>
                                    <th>Total</th>
                                    <th>Hora</th>
                                    <th>Método</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ventasDelDia.map((v) => (
                                    <tr key={v.id}>
                                      <td className="td-strong">{v.prenda}</td>
                                      <td className="text-center">{v.talla}</td>
                                      <td className="text-center">
                                        {v.cantidad}
                                      </td>
                                      <td className="text-right">
                                        $
                                        {parseInt(v.precio).toLocaleString(
                                          "es-CO"
                                        )}
                                      </td>
                                      <td className="text-right">
                                        $
                                        {(
                                          parseInt(v.precio) * v.cantidad
                                        ).toLocaleString("es-CO")}
                                      </td>
                                      <td>{formatearHora(v.fechaHora)}</td>
                                      <td>{v.metodoPago || "N/A"}</td>
                                      <td>
                                        {typeof v.cliente === "string"
                                          ? v.cliente
                                          : v.cliente?.nombre || "N/A"}
                                      </td>
                                      <td>
                                        <span
                                          className={getEstadoBadgeClass(
                                            v.estado
                                          )}
                                          style={{
                                            padding: "4px 8px",
                                            borderRadius: "8px",
                                          }}
                                        >
                                          {getEstadoText(v.estado)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="details-grid">
                              {ventasDelDia.map((v) => (
                                <div key={v.id} className="venta-card">
                                  {/* contenido de tus cards originales */}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
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
