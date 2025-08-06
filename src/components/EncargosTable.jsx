import React, { useState } from "react";

const EncargosTable = ({ encargos, onActualizarEstado, role }) => {
  const [encargoExpandido, setEncargoExpandido] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

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

  const estiloBoton = {
    padding: "5px 10px",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    margin: "2px",
  };

  // Función para extraer fecha formateada
  const formatearFecha = (timestamp) => {
    if (!timestamp) return "-";
    // Admite tanto objetos tipo {seconds} como Date o string
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
      hour: "2-digit",
      minute: "2-digit",
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
    if (
      window.confirm(
        "¿Cancelar este encargo? Esta acción no se puede deshacer."
      )
    ) {
      onActualizarEstado(id, "cancelado");
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
              <th style={estiloEncabezado}>N° Factura</th>
              <th style={estiloEncabezado}>Cliente</th>
              <th style={estiloEncabezado}>Fecha</th>
              <th style={estiloEncabezado}>Total</th>
              <th style={estiloEncabezado}>Estado</th>
              {role === "Admin" && (
                <th style={estiloEncabezado}>Acciones</th>
              )}
            </tr>
        </thead>
        <tbody>
          {encargos.length > 0 ? (
            encargos.map((encargo) => (
              <React.Fragment key={encargo.id}>
                <tr>
                  <td style={estiloCelda}>
                    <button
                      onClick={() => toggleExpandirEncargo(encargo.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "bold",
                        padding: 0,
                        textAlign: "left",
                      }}
                    >
                      {encargoExpandido === encargo.id ? "▼" : "▶"}{" "}
                      {encargo.numeroFactura}
                    </button>
                  </td>
                  <td style={estiloCelda}>
                    {encargo.cliente?.nombre || "N/A"}{" "}
                    {encargo.cliente?.apellido || ""}
                    {encargo.cliente?.telefono &&
                      ` (${encargo.cliente.telefono})`}
                  </td>
                  <td style={estiloCelda}>{formatearFecha(encargo.fecha)}</td>
                  <td style={estiloCelda}>
                    ${encargo.total?.toLocaleString("es-CO") || "0"}
                  </td>
                  <td style={estiloCelda}>
                    <span
                      style={{
                        color:
                          encargo.estado === "pendiente"
                            ? "#FF5722"
                            : encargo.estado === "completado"
                            ? "#4CAF50"
                            : "#f44336",
                        fontWeight: "bold",
                      }}
                    >
                      {encargo.estado}
                    </span>
                  </td>
                  {role === "Admin" && (
                    <td style={estiloCelda}>
                      {encargo.estado === "pendiente" && (
                        <>
                          <button
                            onClick={() => handleCompletarEncargo(encargo.id)}
                            style={{
                              ...estiloBoton,
                              backgroundColor: "#4CAF50",
                              color: "white",
                            }}
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => handleCancelarEncargo(encargo.id)}
                            style={{
                              ...estiloBoton,
                              backgroundColor: "#f44336",
                              color: "white",
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
                {encargoExpandido === encargo.id && (
                  <tr>
                    <td colSpan="6" style={{ backgroundColor: "#f9f9f9" }}>
                      <div
                        style={{
                          background: "#f7faff",
                          borderRadius: 14,
                          boxShadow: "0 2px 14px #1976d215",
                          padding: "30px 28px 18px 28px",
                          margin: "10px auto",
                          maxWidth: 850,
                          border: "1.5px solid #dde6fa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 32,
                            marginBottom: 18,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 210 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: "1.09em",
                                marginBottom: 4,
                              }}
                            >
                              Cliente
                            </div>
                            <div style={{ color: "#222", marginBottom: 3 }}>
                              <b>
                                {encargo.cliente?.nombre || "N/A"}{" "}
                                {encargo.cliente?.apellido || ""}
                              </b>
                            </div>
                            <div style={{ color: "#5c6b7a" }}>
                              <span>
                                Documento:{" "}
                                {encargo.cliente?.documento ||
                                  "No especificado"}
                              </span>
                            </div>
                            <div style={{ color: "#5c6b7a" }}>
                              <span>
                                Teléfono:{" "}
                                {encargo.cliente?.telefono || "No especificado"}
                              </span>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 180, marginTop: 7 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#1976d2",
                                fontSize: "1.04em",
                                marginBottom: 3,
                              }}
                            >
                              Totales del Encargo
                            </div>
                            <button
                              onClick={() => setMostrarHistorial(true)}
                              style={{
                                background: "#1976d2",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "7px 20px",
                                fontWeight: 600,
                                boxShadow: "0 2px 8px #1976d233",
                                cursor: "pointer",
                                marginLeft: 18,
                                fontSize: "1em",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 7,
                              }}
                            >
                              <span style={{ fontSize: "1.1em" }}>🕓</span>
                              Ver historial de pagos
                            </button>
                            {/* CALCULO CORRECTO DE ABONO Y SALDO */}
                            {(() => {
                              // Lógica correcta para cada encargo
                              const abonoReal =
                                (encargo.abono ?? 0) > 0
                                  ? encargo.abono
                                  : encargo.total;
                              const saldoReal =
                                (encargo.total ?? 0) - (abonoReal ?? 0);
                              return (
                                <>
                                  <div style={{ marginBottom: 2 }}>
                                    <span style={{ color: "#2d3a47" }}>
                                      Total:{" "}
                                    </span>
                                    <span
                                      style={{
                                        color: "#1976d2",
                                        fontWeight: 600,
                                      }}
                                    >
                                      ${encargo.total?.toLocaleString("es-CO")}
                                    </span>
                                  </div>
                                  <div style={{ marginBottom: 2 }}>
                                    <span style={{ color: "#2d3a47" }}>
                                      Abono:{" "}
                                    </span>
                                    <span
                                      style={{
                                        color: "#1976d2",
                                        fontWeight: 600,
                                      }}
                                    >
                                      ${abonoReal?.toLocaleString("es-CO")}
                                    </span>
                                  </div>
                                  <div>
                                    <span
                                      style={{
                                        color:
                                          saldoReal > 0 ? "#c62828" : "#2e7d32",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Saldo: $
                                      {saldoReal?.toLocaleString("es-CO")}
                                    </span>
                                    <span
                                      style={{
                                        marginLeft: 12,
                                        color:
                                          saldoReal > 0 ? "#f44336" : "#4caf50",
                                        fontWeight: 700,
                                        fontSize: "1em",
                                        background:
                                          saldoReal > 0 ? "#ffe0e0" : "#e0ffef",
                                        padding: "2.5px 13px",
                                        borderRadius: 8,
                                        marginTop: 1,
                                      }}
                                    >
                                      {saldoReal > 0 ? (
                                        <>⚠️ Pendiente</>
                                      ) : (
                                        <>✅ Pagado</>
                                      )}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                            {/* MODAL y historialPagos */}
                            {(() => {
                              const historialPagos =
                                encargo.historialPagos ||
                                encargo.pagos ||
                                encargo.abonos ||
                                [];
                              return (
                                mostrarHistorial && (
                                  <div
                                    style={{
                                      position: "fixed",
                                      left: 0,
                                      top: 0,
                                      width: "100vw",
                                      height: "100vh",
                                      background: "rgba(30,40,60,0.16)",
                                      zIndex: 20,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <div
                                      style={{
                                        background: "#fff",
                                        borderRadius: 16,
                                        minWidth: 420,
                                        maxWidth: 520,
                                        padding: "28px 34px 22px 34px",
                                        boxShadow: "0 8px 30px #212a4944",
                                        border: "1.5px solid #dde6fa",
                                        position: "relative",
                                      }}
                                    >
                                      <button
                                        onClick={() =>
                                          setMostrarHistorial(false)
                                        }
                                        style={{
                                          position: "absolute",
                                          top: 14,
                                          right: 18,
                                          background: "none",
                                          border: "none",
                                          fontSize: 23,
                                          cursor: "pointer",
                                          color: "#1976d2",
                                        }}
                                        aria-label="Cerrar"
                                      >
                                        ×
                                      </button>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: "1.15em",
                                          color: "#1976d2",
                                          marginBottom: 16,
                                        }}
                                      >
                                        Historial de Pagos
                                      </div>
                                      <table
                                        style={{
                                          width: "100%",
                                          borderCollapse: "collapse",
                                          background: "#f9faff",
                                          borderRadius: 7,
                                          overflow: "hidden",
                                        }}
                                      >
                                        <thead>
                                          <tr style={{ background: "#e3e9ff" }}>
                                            <th style={{ padding: "8px 6px" }}>
                                              Fecha
                                            </th>
                                            <th style={{ padding: "8px 6px" }}>
                                              Valor
                                            </th>
                                            <th style={{ padding: "8px 6px" }}>
                                              Método
                                            </th>
                                            <th style={{ padding: "8px 6px" }}>
                                              Cajero
                                            </th>
                                            <th style={{ padding: "8px 6px" }}>
                                              Saldo
                                            </th>
                                            <th style={{ padding: "8px 6px" }}>
                                              Nota
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {historialPagos &&
                                          historialPagos.length > 0 ? (
                                            historialPagos.map((pago, i) => (
                                              <tr
                                                key={i}
                                                style={{
                                                  background:
                                                    i % 2 ? "#f5f8fc" : "#fff",
                                                }}
                                              >
                                                <td style={{ padding: "7px" }}>
                                                  {formatearFecha(pago.fecha)}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "7px",
                                                    fontWeight: 700,
                                                    color: "#1976d2",
                                                  }}
                                                >
                                                  $
                                                  {parseInt(
                                                    pago.valor
                                                  ).toLocaleString("es-CO")}
                                                </td>
                                                <td style={{ padding: "7px" }}>
                                                  {pago.metodo || "-"}
                                                </td>
                                                <td style={{ padding: "7px" }}>
                                                  {pago.cajero || "-"}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "7px",
                                                    color:
                                                      pago.saldo === 0
                                                        ? "#2e7d32"
                                                        : "#f44336",
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  $
                                                  {parseInt(
                                                    pago._saldoReal
                                                  ).toLocaleString("es-CO")}
                                                  {pago.saldo === 0 ? (
                                                    <span
                                                      style={{
                                                        marginLeft: 7,
                                                        background: "#e0ffef",
                                                        color: "#388e3c",
                                                        padding: "2.5px 10px",
                                                        borderRadius: 8,
                                                        fontWeight: 700,
                                                      }}
                                                    >
                                                      Pagado
                                                    </span>
                                                  ) : null}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "7px",
                                                    color: "#626",
                                                  }}
                                                >
                                                  {pago.nota || ""}
                                                </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td
                                                colSpan={6}
                                                style={{
                                                  textAlign: "center",
                                                  padding: "20px",
                                                  color: "#999",
                                                }}
                                              >
                                                No hay pagos registrados aún.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )
                              );
                            })()}
                          </div>
                        </div>
                        <div
                          style={{
                            marginBottom: 14,
                            fontWeight: 700,
                            color: "#1976d2",
                            fontSize: "1.08em",
                          }}
                        >
                          Productos
                        </div>
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 9,
                            border: "1px solid #e3e9ff",
                            boxShadow: "0 1px 4px #1976d213",
                            overflow: "auto",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "1em",
                            }}
                          >
                            <thead>
                              <tr style={{ background: "#e3e9ff" }}>
                                <th style={{ padding: "8px 7px" }}>Producto</th>
                                <th style={{ padding: "8px 7px" }}>Talla</th>
                                <th style={{ padding: "8px 7px" }}>Cantidad</th>
                                <th style={{ padding: "8px 7px" }}>
                                  Precio Unit.
                                </th>
                                <th style={{ padding: "8px 7px" }}>Colegio</th>
                                <th style={{ padding: "8px 7px" }}>Total</th>
                                <th style={{ padding: "8px 7px" }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {encargo.productos?.map((producto, index) => (
                                <tr
                                  key={index}
                                  style={{
                                    background: index % 2 ? "#f9fafe" : "#fff",
                                    transition: "background 0.2s",
                                  }}
                                >
                                  <td style={{ padding: "8px 7px" }}>
                                    {producto.prenda}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    {producto.talla}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    {producto.cantidad}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    $
                                    {parseInt(producto.precio).toLocaleString(
                                      "es-CO"
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    {producto.colegio}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    $
                                    {parseInt(
                                      producto.precio * producto.cantidad
                                    ).toLocaleString("es-CO")}
                                  </td>
                                  <td style={{ padding: "8px 7px" }}>
                                    {producto.entregado === true ? (
                                      <span
                                        style={{
                                          background: "#e0ffef",
                                          color: "#388e3c",
                                          padding: "4px 12px",
                                          borderRadius: 14,
                                          fontWeight: 700,
                                          fontSize: "0.98em",
                                          display: "inline-block",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "1.06em",
                                            marginRight: 5,
                                          }}
                                        >
                                          ✅
                                        </span>
                                        Entregado
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          background: "#ffe0e0",
                                          color: "#c62828",
                                          padding: "4px 12px",
                                          borderRadius: 14,
                                          fontWeight: 700,
                                          fontSize: "0.98em",
                                          display: "inline-block",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "1.06em",
                                            marginRight: 5,
                                          }}
                                        >
                                          ⚠️
                                        </span>
                                        Pendiente
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                No hay encargos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EncargosTable;
