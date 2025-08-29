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

  // 🔧 Normaliza cualquier forma de encargo a una sola interfaz para la tabla
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
      // mantenemos tu contrato actual
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

  const badgeEstadoClase = (estado) => {
    if (estado === "pagado") return "badge--paid";
    if (estado === "entregado" || estado === "completado")
      return "badge--delivered";
    // default/pending
    return "badge--pending";
    // (Si prefieres tus clases antiguas exactas: "badge--pending" / "badge--delivered")
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
              <th>N° Encargo</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Abono</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {encargos?.length > 0 ? (
              encargos.map((enc) => {
                const r = normalizeEncargo(enc);
                return (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td>
                        <button
                          onClick={() => toggleExpandirEncargo(r.id)}
                          aria-label={`Mostrar detalles de ${r.numero}`}
                          className="pill pill--ghost"
                          title="Ver productos"
                        >
                          {r.numero}
                        </button>
                      </td>
                      <td>{r.cliente?.nombre || "N/A"}</td>
                      <td>{formatearFecha(r.createdAt)}</td>
                      <td>${r.total.toLocaleString("es-CO")}</td>
                      <td>${r.abono.toLocaleString("es-CO")}</td>
                      <td>
                        <span
                          className={`badge ${
                            r.saldo === 0 ? "badge--paid" : "badge--pending"
                          }`}
                        >
                          ${r.saldo.toLocaleString("es-CO")}{" "}
                          {r.saldo === 0 ? "· Pagado" : "· Pendiente"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${badgeEstadoClase(r.estado)}`}>
                          {r.estado === "pendiente" ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation" />{" "}
                              Pendiente
                            </>
                          ) : r.estado === "pagado" ? (
                            <>
                              <i className="fa-solid fa-check" /> Pagado
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-check" /> Entregado
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {typeof onVerDetalle === "function" && (
                          <button
                            className="btn-primary"
                            onClick={() => onVerDetalle(r)} // modal reutilizable si lo pasas desde el padre
                            title="Ver detalle (modal)"
                          >
                            Ver detalle
                          </button>
                        )}

                        {role === "Admin" && r.estado === "pendiente" && (
                          <>
                            <button
                              className="btn-primary"
                              onClick={() => handleCompletarEncargo(r.id)}
                            >
                              Completar
                            </button>
                            <button
                              className="btn-primary"
                              style={{ background: "#db2828" }}
                              onClick={() => handleCancelarEncargo(r.id)}
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>

                    {encargoExpandido === r.id && (
                      <tr>
                        <td colSpan={8}>
                          <div className="encargo-detail">
                            <div className="encargo-head">
                              <div className="encargo-client">
                                <h4>Cliente</h4>
                                <p>
                                  <strong>{r.cliente?.nombre || "N/A"}</strong>
                                </p>
                                <p>{r.cliente?.documento || ""}</p>
                                <p>{r.cliente?.telefono || ""}</p>
                              </div>

                              <div className="encargo-totals">
                                <div className="totals-header">
                                  <h4>Totales del Encargo</h4>
                                  <button
                                    className="pill"
                                    onClick={() => setMostrarHistorial(true)}
                                    aria-label="Ver historial de pagos"
                                  >
                                    <i className="fa-solid fa-circle-info" />{" "}
                                    Ver historial de pagos
                                  </button>
                                </div>

                                <p>Total: ${r.total.toLocaleString("es-CO")}</p>
                                <p>Abono: ${r.abono.toLocaleString("es-CO")}</p>
                                <p>
                                  Saldo: ${r.saldo.toLocaleString("es-CO")}{" "}
                                  <span
                                    className={`badge ${
                                      r.saldo === 0
                                        ? "badge--paid"
                                        : "badge--pending"
                                    }`}
                                  >
                                    <i
                                      className={`fa-solid ${
                                        r.saldo === 0
                                          ? "fa-check"
                                          : "fa-triangle-exclamation"
                                      }`}
                                    />{" "}
                                    {r.saldo === 0 ? "Pagado" : "Pendiente"}
                                  </span>
                                </p>
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
                                    {(r.items || []).map((p, idx) => {
                                      const cantidad = Number(p.cantidad || 0);
                                      const unit = Number(
                                        p.vrUnitario ?? p.precio ?? 0
                                      );
                                      const totalItem = Number(
                                        p.vrTotal ?? p.total ?? cantidad * unit
                                      );
                                      const entregado = !!p.entregado; // si no existe, asumimos false

                                      return (
                                        <tr key={idx}>
                                          <td>
                                            {p.producto || p.prenda || "-"}
                                          </td>
                                          <td>{p.talla || "-"}</td>
                                          <td>{cantidad}</td>
                                          <td>
                                            ${unit.toLocaleString("es-CO")}
                                          </td>
                                          <td>
                                            {p.plantel || p.colegio || "-"}
                                          </td>
                                          <td>
                                            ${totalItem.toLocaleString("es-CO")}
                                          </td>
                                          <td>
                                            <span
                                              className={`badge ${
                                                entregado
                                                  ? "badge--delivered"
                                                  : "badge--pending"
                                              }`}
                                            >
                                              <i
                                                className={`fa-solid ${
                                                  entregado
                                                    ? "fa-check"
                                                    : "fa-triangle-exclamation"
                                                }`}
                                              />
                                              {entregado
                                                ? " Entregado"
                                                : " Pendiente entrega"}
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
              })
            ) : (
              <tr>
                <td colSpan={8}>No hay encargos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EncargosTable;
