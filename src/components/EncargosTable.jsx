import React, { useState } from "react";

const EncargosTable = ({ encargos, onActualizarEstado, role }) => {
  const [encargoExpandido, setEncargoExpandido] = useState(null);
  const [, setMostrarHistorial] = useState(false);

  const formatearFecha = (timestamp) => {
    if (!timestamp) return "-";
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const toggleExpandirEncargo = (id) => {
    setEncargoExpandido(encargoExpandido === id ? null : id);
  };

  const handleCompletarEncargo = (id) => {
    if (window.confirm("¿Marcar este encargo como completado?")) {
      onActualizarEstado(id, "completado");
    }
  };

  const handleCancelarEncargo = (id) => {
    if (window.confirm("¿Cancelar este encargo? Esta acción no se puede deshacer.")) {
      onActualizarEstado(id, "cancelado");
    }
  };

  return (
    <div className="resumen-encargos">
      <h3>
        <i className="fa-solid fa-clipboard-list" /> Resumen de Encargos
      </h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>N° Factura</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {encargos.length > 0 ? (
              encargos.map((encargo) => (
                <React.Fragment key={encargo.id}>
                  <tr>
                    <td>
                      <button
                        onClick={() => toggleExpandirEncargo(encargo.id)}
                        aria-label={`Mostrar detalles de ${encargo.numeroFactura}`}
                        className="pill pill--ghost"
                      >
                        {encargo.numeroFactura}
                      </button>
                    </td>
                    <td>
                      {encargo.cliente?.nombre || "N/A"}{" "}
                      {encargo.cliente?.apellido || ""}
                    </td>
                    <td>{formatearFecha(encargo.fecha)}</td>
                    <td>${encargo.total?.toLocaleString("es-CO") || "0"}</td>
                    <td>
                      <span
                        className={`badge ${
                          encargo.estado === "pendiente"
                            ? "badge--pending"
                            : "badge--delivered"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            encargo.estado === "pendiente"
                              ? "fa-triangle-exclamation"
                              : "fa-check"
                          }`}
                        ></i>
                        {encargo.estado === "pendiente"
                          ? " Pendiente entrega"
                          : " Entregado"}
                      </span>
                    </td>
                    <td>
                      {role === "Admin" && encargo.estado === "pendiente" && (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() => handleCompletarEncargo(encargo.id)}
                          >
                            Completar
                          </button>
                          <button
                            className="btn-primary"
                            style={{ background: "#db2828" }}
                            onClick={() => handleCancelarEncargo(encargo.id)}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {encargoExpandido === encargo.id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="encargo-detail">
                          <div className="encargo-head">
                            <div className="encargo-client">
                              <h4>Cliente</h4>
                              <p><strong>{encargo.cliente?.nombre || "N/A"}</strong></p>
                              <p>{encargo.cliente?.documento || ""}</p>
                              <p>{encargo.cliente?.telefono || ""}</p>
                            </div>
                            <div className="encargo-totals">
                              <div className="totals-header">
                                <h4>Totales del Encargo</h4>
                                <button
                                  className="pill"
                                  onClick={() => setMostrarHistorial(true)}
                                  aria-label="Ver historial de pagos"
                                >
                                  <i className="fa-solid fa-circle-info" /> Ver historial de pagos
                                </button>
                              </div>
                              <p>
                                Total: ${encargo.total?.toLocaleString("es-CO") || "0"}
                              </p>
                              <p>
                                Abono: ${encargo.abono?.toLocaleString("es-CO") || "0"}
                              </p>
                              {(() => {
                                const isPagado = Number(encargo.saldo) === 0;
                                return (
                                  <p>
                                    Saldo: ${encargo.saldo?.toLocaleString("es-CO") || "0"}{" "}
                                    <span
                                      className={`badge ${
                                        isPagado ? "badge--paid" : "badge--pending"
                                      }`}
                                    >
                                      <i
                                        className={`fa-solid ${
                                          isPagado
                                            ? "fa-check"
                                            : "fa-triangle-exclamation"
                                        }`}
                                      />{" "}
                                      {isPagado ? "Pagado" : "Pendiente"}
                                    </span>
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="encargo-products">
                            <h4>Productos</h4>
                            <div className="table-wrapper">
                              <table className="tabla-encargos">
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th>Talla</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Colegio</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {encargo.productos?.map((p, idx) => (
                                    <tr key={idx}>
                                      <td>{p.prenda}</td>
                                      <td>{p.talla}</td>
                                      <td>{p.cantidad}</td>
                                      <td>${p.precio?.toLocaleString("es-CO")}</td>
                                      <td>{p.colegio}</td>
                                      <td>
                                        ${
                                          (p.precio * p.cantidad).toLocaleString(
                                            "es-CO"
                                          )
                                        }
                                      </td>
                                      <td>
                                        <span
                                          className={`badge ${
                                            p.entregado
                                              ? "badge--delivered"
                                              : "badge--pending"
                                          }`}
                                        >
                                          <i
                                            className={`fa-solid ${
                                              p.entregado ? "fa-check" : "fa-triangle-exclamation"
                                            }`}
                                          ></i>
                                          {p.entregado ? " Entregado" : " Pendiente entrega"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No hay encargos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EncargosTable;
