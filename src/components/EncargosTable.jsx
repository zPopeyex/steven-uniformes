import React, { useState } from "react";

const EncargosTable = ({ encargos, onActualizarEstado }) => {
  const [encargoExpandido, setEncargoExpandido] = useState(null);

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
    if (!timestamp?.seconds) return "-";
    const date = new Date(timestamp.seconds * 1000);
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
            <th style={estiloEncabezado}>Acciones</th>
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
                </tr>
                {encargoExpandido === encargo.id && (
                  <tr>
                    <td colSpan="6" style={{ backgroundColor: "#f9f9f9" }}>
                      <div style={{ padding: "15px" }}>
                        <h4 style={{ marginTop: 0 }}>Detalles del Encargo</h4>

                        <div style={{ marginBottom: "10px" }}>
                          <strong>Cliente:</strong> {encargo.cliente?.nombre}{" "}
                          {encargo.cliente?.apellido}
                          <br />
                          <strong>Documento:</strong>{" "}
                          {encargo.cliente?.documento || "No especificado"}
                          <br />
                          <strong>Teléfono:</strong>{" "}
                          {encargo.cliente?.telefono || "No especificado"}
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                          <strong>Productos:</strong>
                          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                            {encargo.productos?.map((producto, index) => (
                              <li key={index}>
                                {producto.cantidad}x {producto.prenda} (
                                {producto.talla}) - $
                                {producto.precio?.toLocaleString("es-CO")} c/u
                                <br />
                                <small>
                                  Colegio: {producto.colegio} - Total: $
                                  {(
                                    producto.precio * producto.cantidad
                                  ).toLocaleString("es-CO")}
                                </small>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong>Total Encargo:</strong> $
                          {encargo.total?.toLocaleString("es-CO")}
                          <br />
                          <strong>Abono:</strong> $
                          {(encargo.abono !== undefined
                            ? encargo.abono
                            : encargo.total
                          )?.toLocaleString("es-CO")}
                          <br />
                          {(encargo.total || 0) -
                            (encargo.abono > 0
                              ? encargo.abono
                              : encargo.total || 0) >
                          0 ? (
                            <>
                              <strong>Saldo:</strong>{" "}
                              <span
                                style={{ color: "#f44336", fontWeight: "bold" }}
                              >
                                $
                                {(
                                  encargo.total -
                                  (encargo.abono ?? encargo.total)
                                ).toLocaleString("es-CO")}
                              </span>
                              <span
                                style={{
                                  marginLeft: 10,
                                  color: "#f44336",
                                  fontWeight: "bold",
                                }}
                              >
                                ⚠️ Pendiente
                              </span>
                            </>
                          ) : (
                            <span
                              style={{ color: "#4CAF50", fontWeight: "bold" }}
                            >
                              ✅ Pagado
                            </span>
                          )}
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
