import React, { useState } from "react";
import "../../styles/modern-ui.css";

const VentasTableModern = ({
  ventas,
  onActualizarEstado,
  totalVentas,
  role,
}) => {
  const [fechasExpandidas, setFechasExpandidas] = useState({});
  const SHOW_DETAILS_AS_TABLE = true; // <- ponlo en true para usar tabla

  const formatearFecha = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatearHora = (timestamp) => {
    if (!timestamp?.seconds) return "-";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ventasPorFecha = ventas.reduce((acc, venta) => {
    const fecha = formatearFecha(venta.fechaHora);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(venta);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(ventasPorFecha).sort((a, b) => {
    return (
      new Date(b.split("/").reverse().join("-")) -
      new Date(a.split("/").reverse().join("-"))
    );
  });

  const toggleExpandirFecha = (fecha) =>
    setFechasExpandidas((prev) => ({ ...prev, [fecha]: !prev[fecha] }));

  const getEstadoBadgeClass = (estado) =>
    ({
      venta: "badge badge-paid",
      separado: "badge badge-pending",
      encargo: "badge badge-warning",
    }[estado] || "badge badge-default");

  const getEstadoText = (estado) =>
    ({ venta: "Venta", separado: "Separado", encargo: "Encargo" }[estado] ||
    "N/A");

  const getEstadoIcon = (estado) =>
    ({ venta: "✔", separado: "⏳", encargo: "🗒" }[estado] || "•");

  return (
    <div className="modern-ventas-table">
      <div className="table-header header--success">
        <div className="header-content">
          <h3>Resumen de Ventas</h3>
          {totalVentas !== undefined && (
            <div className="total-display">
              <span className="total-label">Total:</span>
              <span className="total-amount">
                ${totalVentas.toLocaleString("es-CO")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="table-container">
        {!ventas?.length ? (
          <div className="empty-state">
            <h4>No hay ventas registradas</h4>
            <p>
              Las ventas aparecerán aquí una vez que se realicen transacciones.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="ventas-table">
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
                  const estaExpandida = !!fechasExpandidas[fecha];

                  return (
                    <React.Fragment key={fecha}>
                      <tr className="date-row">
                        <td>
                          <div className="fecha-container">
                            <span className="fecha-text">{fecha}</span>
                            <span className="transacciones-count">
                              {ventasDelDia.length} transacciones
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="total-dia">
                            ${totalDia.toLocaleString("es-CO")}
                          </span>
                        </td>
                        <td>
                          <button
                            className="expand-btn"
                            onClick={() => toggleExpandirFecha(fecha)}
                          >
                            {estaExpandida ? "Ocultar" : "Ver"} detalles
                          </button>
                        </td>
                      </tr>

                      {estaExpandida && (
                        <tr className="expanded-details">
                          <td colSpan="3">
                            {SHOW_DETAILS_AS_TABLE ? (
                              <div className="details-container">
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
                                          <td className="td-strong">
                                            {v.prenda}
                                          </td>
                                          <td className="text-center">
                                            {v.talla}
                                          </td>
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
                                            {parseInt(
                                              v.precio * v.cantidad
                                            ).toLocaleString("es-CO")}
                                          </td>
                                          <td>{formatearHora(v.fechaHora)}</td>
                                          <td>{v.metodoPago || "N/A"}</td>
                                          <td>
                                            {(() => {
                                              if (typeof v.cliente === "string" && v.cliente.trim()) {
                                                return v.cliente;
                                              }
                                              if (v.cliente?.nombre) {
                                                return v.cliente.nombre;
                                              }
                                              if (v.clienteResumen?.nombre) {
                                                return v.clienteResumen.nombre;
                                              }
                                              return "sin cliente";
                                            })()}
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
                              </div>
                            ) : (
                              /* aquí dejas tu bloque actual de cards tal cual */
                              <div className="details-grid"> ...cards...</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VentasTableModern;
