import React, { useState } from "react";

const EncargosTable = ({
  encargos,
  onActualizarEstado,
  role,
  onVerDetalle,
}) => {
  const [encargoExpandido, setEncargoExpandido] = useState(null);
  const [, setMostrarHistorial] = useState(false);

  const formatearFecha = (tsOrIso) => {
    if (!tsOrIso) return "-";
    let d;
    if (tsOrIso?.seconds) d = new Date(tsOrIso.seconds * 1000);
    else d = new Date(tsOrIso);
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Normaliza cualquier forma de encargo
  const normalizeEncargo = (e) => {
    const numero =
      e.codigoCorto || e.numeroCorto || e.numero || e.numeroFactura || e.id;
    const cliente = e.clienteResumen ||
      e.cliente || {
        nombre: e.clienteNombre || "N/A",
        documento: e.clienteDocumento || "",
        telefono: e.clienteTelefono || "",
      };
    const created = e.createdAt || e.fecha || e._createdAt || Date.now();
    const total = Number(e.total || 0);
    const abono = Number(e.abono || 0);
    const saldo =
      e.saldo !== undefined && e.saldo !== null
        ? Number(e.saldo)
        : Math.max(total - abono, 0);
    const estado = e.estado || (saldo === 0 ? "pagado" : "pendiente");
    const items = Array.isArray(e.items)
      ? e.items
      : Array.isArray(e.productos)
      ? e.productos
      : [];
    return {
      id: e.id,
      numero,
      cliente,
      createdAt: created,
      total,
      abono,
      saldo,
      estado,
      items,
      raw: e,
    };
  };

  const toggleExpandirEncargo = (id) => {
    setEncargoExpandido(encargoExpandido === id ? null : id);
  };

  const handleCompletarEncargo = (id) => {
    if (window.confirm("¿Marcar este encargo como completado/entregado?")) {
      onActualizarEstado?.(id, "completado");
    }
  };
  const handleCancelarEncargo = (id) => {
    if (
      window.confirm(
        "¿Cancelar este encargo? Esta acción no se puede deshacer."
      )
    ) {
      onActualizarEstado?.(id, "cancelado");
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "pagado":
        return "badge badge-paid";
      case "entregado":
      case "completado":
        return "badge badge-delivered";
      case "cancelado":
        return "badge badge-cancelled";
      default:
        return "badge badge-pending";
    }
  };
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case "pagado":
        return "fa-solid fa-check-circle";
      case "entregado":
      case "completado":
        return "fa-solid fa-truck";
      case "cancelado":
        return "fa-solid fa-times-circle";
      default:
        return "fa-solid fa-clock";
    }
  };
  const getEstadoText = (estado) => {
    switch (estado) {
      case "pagado":
        return "Pagado";
      case "entregado":
      case "completado":
        return "Entregado";
      case "cancelado":
        return "Cancelado";
      default:
        return "Pendiente";
    }
  };

  return (
    <div className="modern-encargos-table">
      <div className="table-header">
        <h3>
          <i className="fa-solid fa-clipboard-list" /> Resumen de Encargos
        </h3>
        <div className="table-stats">
          <span className="stat-item">
            <i className="fa-solid fa-list-ol" /> {encargos?.length || 0}{" "}
            encargos
          </span>
        </div>
      </div>

      <div className="table-container">
        {!encargos?.length ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fa-solid fa-clipboard-list" />
            </div>
            <h4>No hay encargos registrados</h4>
            <p>Los encargos aparecerán aquí una vez que se creen.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="encargos-table">
              <thead>
                <tr>
                  <th className="col-numero">N° Encargo</th>
                  <th className="col-cliente">Cliente</th>
                  <th className="col-fecha">Fecha</th>
                  <th className="col-total">Total</th>
                  <th className="col-abono">Abono</th>
                  <th className="col-saldo">Saldo</th>
                  <th className="col-estado">Estado</th>
                  <th className="col-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {encargos.map((enc) => {
                  const r = normalizeEncargo(enc);
                  const isExpanded = encargoExpandido === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="table-row">
                        <td className="col-numero">
                          <button
                            onClick={() => toggleExpandirEncargo(r.id)}
                            className="numero-button"
                            title="Ver productos"
                          >
                            <span className="numero-text">{r.numero}</span>
                            <i
                              className={`expand-icon fa-solid ${
                                isExpanded
                                  ? "fa-chevron-down"
                                  : "fa-chevron-right"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="col-cliente">
                          <div className="cliente-info">
                            <span className="cliente-nombre">
                              {r.cliente?.nombre || "N/A"}
                            </span>
                            {r.cliente?.telefono && (
                              <span className="cliente-telefono">
                                {r.cliente.telefono}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="col-fecha">
                          <span className="fecha-text">
                            {formatearFecha(r.createdAt)}
                          </span>
                        </td>
                        <td className="col-total">
                          <span className="total-amount">
                            ${r.total.toLocaleString("es-CO")}
                          </span>
                        </td>
                        <td className="col-abono">
                          <span className="abono-amount">
                            ${r.abono.toLocaleString("es-CO")}
                          </span>
                        </td>
                        <td className="col-saldo">
                          <div className="saldo-container">
                            <span
                              className={`saldo-amount ${
                                r.saldo === 0 ? "paid" : "pending"
                              }`}
                            >
                              ${r.saldo.toLocaleString("es-CO")}
                            </span>
                            <span
                              className={`saldo-badge ${
                                r.saldo === 0 ? "paid" : "pending"
                              }`}
                            >
                              {r.saldo === 0 ? "Pagado" : "Pendiente"}
                            </span>
                          </div>
                        </td>
                        <td className="col-estado">
                          <span className={getBadgeClass(r.estado)}>
                            <i className={getEstadoIcon(r.estado)} />{" "}
                            {getEstadoText(r.estado)}
                          </span>
                        </td>
                        <td className="col-acciones">
                          <div className="actions-group">
                            {typeof onVerDetalle === "function" && (
                              <button
                                className="action-btn btn-view"
                                onClick={() => onVerDetalle(r)}
                                title="Ver detalle completo"
                              >
                                <i className="fa-solid fa-eye" />
                              </button>
                            )}
                            {role === "Admin" && r.estado === "pendiente" && (
                              <>
                                <button
                                  className="action-btn btn-complete"
                                  onClick={() => handleCompletarEncargo(r.id)}
                                  title="Marcar como completado"
                                >
                                  <i className="fa-solid fa-check" />
                                </button>
                                <button
                                  className="action-btn btn-cancel"
                                  onClick={() => handleCancelarEncargo(r.id)}
                                  title="Cancelar encargo"
                                >
                                  <i className="fa-solid fa-times" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="8">
                            <div className="encargo-details">
                              <div className="details-header">
                                <div className="client-details">
                                  <h4>
                                    <i className="fa-solid fa-user" />{" "}
                                    Información del Cliente
                                  </h4>
                                  <div className="client-info-grid">
                                    <div className="info-item">
                                      <span className="info-label">
                                        Nombre:
                                      </span>
                                      <span className="info-value">
                                        {r.cliente?.nombre || "N/A"}
                                      </span>
                                    </div>
                                    <div className="info-item">
                                      <span className="info-label">
                                        Documento:
                                      </span>
                                      <span className="info-value">
                                        {r.cliente?.documento || "-"}
                                      </span>
                                    </div>
                                    <div className="info-item">
                                      <span className="info-label">
                                        Teléfono:
                                      </span>
                                      <span className="info-value">
                                        {r.cliente?.telefono || "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="totals-summary">
                                  <h4>
                                    <i className="fa-solid fa-calculator" />{" "}
                                    Resumen Financiero
                                    <button
                                      className="historial-btn"
                                      onClick={() => setMostrarHistorial(true)}
                                      title="Ver historial de pagos"
                                    >
                                      <i className="fa-solid fa-history" />{" "}
                                      Historial
                                    </button>
                                  </h4>
                                  <div className="summary-grid">
                                    <div className="summary-item">
                                      <span className="summary-label">
                                        Total:
                                      </span>
                                      <span className="summary-value total">
                                        ${r.total.toLocaleString("es-CO")}
                                      </span>
                                    </div>
                                    <div className="summary-item">
                                      <span className="summary-label">
                                        Abono:
                                      </span>
                                      <span className="summary-value abono">
                                        ${r.abono.toLocaleString("es-CO")}
                                      </span>
                                    </div>
                                    <div className="summary-item">
                                      <span className="summary-label">
                                        Saldo:
                                      </span>
                                      <span
                                        className={`summary-value saldo ${
                                          r.saldo === 0 ? "paid" : "pending"
                                        }`}
                                      >
                                        ${r.saldo.toLocaleString("es-CO")}
                                      </span>
                                      <span
                                        className={`status-indicator ${
                                          r.saldo === 0 ? "paid" : "pending"
                                        }`}
                                      >
                                        <i
                                          className={`fa-solid ${
                                            r.saldo === 0
                                              ? "fa-check"
                                              : "fa-exclamation-triangle"
                                          }`}
                                        />
                                        {r.saldo === 0 ? "Pagado" : "Pendiente"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="products-section">
                                <h4>
                                  <i className="fa-solid fa-boxes" /> Productos
                                  del Encargo
                                </h4>
                                <div className="products-table-wrapper">
                                  <table className="products-table">
                                    <thead>
                                      <tr>
                                        <th>Producto</th>
                                        <th>Talla</th>
                                        <th>Cant.</th>
                                        <th>P. Unit.</th>
                                        <th>Colegio</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(r.items || []).map((p, idx) => {
                                        const cantidad = Number(
                                          p.cantidad || 0
                                        );
                                        const unit = Number(
                                          p.vrUnitario ?? p.precio ?? 0
                                        );
                                        const totalItem = Number(
                                          p.vrTotal ??
                                            p.total ??
                                            cantidad * unit
                                        );
                                        const entregado = !!p.entregado;
                                        return (
                                          <tr key={idx} className="product-row">
                                            <td className="product-name">
                                              {p.producto || p.prenda || "-"}
                                            </td>
                                            <td className="product-size">
                                              {p.talla || "-"}
                                            </td>
                                            <td className="product-qty">
                                              {cantidad}
                                            </td>
                                            <td className="product-price">
                                              ${unit.toLocaleString("es-CO")}
                                            </td>
                                            <td className="product-school">
                                              {p.plantel || p.colegio || "-"}
                                            </td>
                                            <td className="product-total">
                                              $
                                              {totalItem.toLocaleString(
                                                "es-CO"
                                              )}
                                            </td>
                                            <td className="product-status">
                                              <span
                                                className={`delivery-badge ${
                                                  entregado
                                                    ? "delivered"
                                                    : "pending"
                                                }`}
                                              >
                                                <i
                                                  className={`fa-solid ${
                                                    entregado
                                                      ? "fa-check"
                                                      : "fa-clock"
                                                  }`}
                                                />
                                                {entregado
                                                  ? "Entregado"
                                                  : "Pendiente"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
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

export default EncargosTable;
