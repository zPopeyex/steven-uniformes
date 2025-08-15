// 📄 src/pages/ReportesModistas.jsx
import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaChartBar, FaDownload, FaCalendarAlt } from "react-icons/fa";
import "../styles/inventario.css";

const ReportesModistas = () => {
  const [inventario, setInventario] = useState([]);
  const [modistas, setModistas] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaDesde: "",
    fechaHasta: "",
    modistaId: "",
    plantel: "",
  });
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      // Cargar inventario con modistas
      const inventarioSnap = await getDocs(
        query(collection(db, "inventario"), orderBy("fechaHora", "desc"))
      );
      const inventarioData = inventarioSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.modista); // Solo items que tienen modista

      // Cargar modistas
      const modistasSnap = await getDocs(collection(db, "modistas"));
      const modistasData = modistasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setInventario(inventarioData);
      setModistas(modistasData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // Configurar fechas por defecto (último mes)
    const hoy = new Date();
    const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFiltros((prev) => ({
      ...prev,
      fechaDesde: primerDiaDelMes.toISOString().split("T")[0],
      fechaHasta: hoy.toISOString().split("T")[0],
    }));
  }, []);

  // Datos filtrados
  const datosFiltrados = useMemo(() => {
    return inventario.filter((item) => {
      // Filtro de fecha
      if (filtros.fechaDesde || filtros.fechaHasta) {
        let fechaItem;
        if (item.fechaHora?.seconds) {
          fechaItem = new Date(item.fechaHora.seconds * 1000);
        } else if (item.fechaHora) {
          fechaItem = new Date(item.fechaHora);
        } else {
          return false;
        }

        const fechaStr = fechaItem.toISOString().split("T")[0];

        if (filtros.fechaDesde && fechaStr < filtros.fechaDesde) return false;
        if (filtros.fechaHasta && fechaStr > filtros.fechaHasta) return false;
      }

      // Filtro de modista
      if (filtros.modistaId && item.modista?.id !== filtros.modistaId)
        return false;

      // Filtro de plantel
      if (filtros.plantel && item.colegio !== filtros.plantel) return false;

      return true;
    });
  }, [inventario, filtros]);

  // Estadísticas generales
  const estadisticas = useMemo(() => {
    const totalProductos = datosFiltrados.reduce(
      (sum, item) => sum + (item.cantidad || 0),
      0
    );
    const totalPagarModistas = datosFiltrados.reduce(
      (sum, item) => sum + (item.modista?.totalPagar || 0),
      0
    );
    const totalVentas = datosFiltrados.reduce(
      (sum, item) => sum + (item.precio * item.cantidad || 0),
      0
    );
    const margenGanancia =
      totalVentas > 0
        ? ((totalVentas - totalPagarModistas) / totalVentas) * 100
        : 0;

    return {
      totalProductos,
      totalPagarModistas,
      totalVentas,
      margenGanancia,
    };
  }, [datosFiltrados]);

  // Reportes por modista
  const reportesPorModista = useMemo(() => {
    const reportes = {};

    datosFiltrados.forEach((item) => {
      const modistaId = item.modista?.id;
      if (!modistaId) return;

      if (!reportes[modistaId]) {
        reportes[modistaId] = {
          nombre: item.modista.nombre,
          totalProductos: 0,
          totalPagar: 0,
          productos: {},
          planteles: new Set(),
        };
      }

      const reporte = reportes[modistaId];
      reporte.totalProductos += item.cantidad || 0;
      reporte.totalPagar += item.modista.totalPagar || 0;
      reporte.planteles.add(item.colegio);

      // Agrupar productos
      const productoKey = `${item.colegio} - ${item.prenda}`;
      if (!reporte.productos[productoKey]) {
        reporte.productos[productoKey] = {
          cantidad: 0,
          totalPagar: 0,
        };
      }
      reporte.productos[productoKey].cantidad += item.cantidad || 0;
      reporte.productos[productoKey].totalPagar += item.modista.totalPagar || 0;
    });

    return Object.values(reportes).sort((a, b) => b.totalPagar - a.totalPagar);
  }, [datosFiltrados]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const exportarReporte = () => {
    if (datosFiltrados.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const headers = [
      "Fecha",
      "Hora",
      "Modista",
      "Plantel",
      "Producto",
      "Talla",
      "Cantidad",
      "Precio Venta",
      "Costo Confección",
      "Ganancia",
      "Margen %",
    ];

    const csvContent = [
      headers.join(","),
      ...datosFiltrados.map((item) => {
        const fecha = item.fechaHora?.seconds
          ? new Date(item.fechaHora.seconds * 1000)
          : new Date(item.fechaHora || Date.now());

        const ganancia =
          item.precio * item.cantidad - (item.modista?.totalPagar || 0);
        const margen =
          item.precio * item.cantidad > 0
            ? (ganancia / (item.precio * item.cantidad)) * 100
            : 0;

        return [
          fecha.toLocaleDateString("es-CO"),
          fecha.toLocaleTimeString("es-CO"),
          `"${item.modista?.nombre || ""}"`,
          `"${item.colegio || ""}"`,
          `"${item.prenda || ""}"`,
          item.talla || "",
          item.cantidad || 0,
          item.precio * item.cantidad || 0,
          item.modista?.totalPagar || 0,
          ganancia,
          margen.toFixed(1),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte_modistas_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obtener planteles únicos
  const planteles = [...new Set(inventario.map((item) => item.colegio))].filter(
    Boolean
  );

  if (loading) {
    return (
      <div className="st-inv-page">
        <div
          style={{
            fontWeight: "bold",
            fontSize: "18px",
            backgroundColor: "#f4f4f4",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          ⏳ Cargando reportes...
        </div>
      </div>
    );
  }

  return (
    <div className="st-inv-page">
      {/* Header */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaChartBar />
          <h2 className="st-inv-card-title">Reportes de Modistas y Pagos</h2>
          <button
            className="st-inv-btn-primary"
            onClick={exportarReporte}
            style={{ marginLeft: "auto" }}
          >
            <FaDownload /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaCalendarAlt />
          <h3 className="st-inv-card-title">Filtros de Fecha y Datos</h3>
        </div>
        <div
          style={{
            background: "#e3f2fd",
            border: "2px solid var(--st-primary)",
            borderRadius: "var(--st-radius)",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Fecha Desde
              </label>
              <input
                type="date"
                name="fechaDesde"
                value={filtros.fechaDesde}
                onChange={handleFiltroChange}
                className="st-inv-field"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Fecha Hasta
              </label>
              <input
                type="date"
                name="fechaHasta"
                value={filtros.fechaHasta}
                onChange={handleFiltroChange}
                className="st-inv-field"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Modista
              </label>
              <select
                name="modistaId"
                value={filtros.modistaId}
                onChange={handleFiltroChange}
                className="st-inv-field"
              >
                <option value="">Todas las modistas</option>
                {modistas.map((modista) => (
                  <option key={modista.id} value={modista.id}>
                    {modista.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Plantel
              </label>
              <select
                name="plantel"
                value={filtros.plantel}
                onChange={handleFiltroChange}
                className="st-inv-field"
              >
                <option value="">Todos los planteles</option>
                {planteles.map((plantel) => (
                  <option key={plantel} value={plantel}>
                    {plantel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaChartBar />
          <h3 className="st-inv-card-title">Estadísticas del Período</h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0052CC, #0040A3)",
              color: "white",
              padding: "25px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "2.5em",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              {estadisticas.totalProductos.toLocaleString()}
            </div>
            <div style={{ opacity: 0.9, fontSize: "1.1em" }}>
              Productos Confeccionados
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #21ba45, #16a330)",
              color: "white",
              padding: "25px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "2.5em",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              ${estadisticas.totalPagarModistas.toLocaleString()}
            </div>
            <div style={{ opacity: 0.9, fontSize: "1.1em" }}>
              Total a Pagar a Modistas
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #f39c12, #e67e22)",
              color: "white",
              padding: "25px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "2.5em",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              ${estadisticas.totalVentas.toLocaleString()}
            </div>
            <div style={{ opacity: 0.9, fontSize: "1.1em" }}>
              Valor Total de Ventas
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #9b59b6, #8e44ad)",
              color: "white",
              padding: "25px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "2.5em",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              {estadisticas.margenGanancia.toFixed(1)}%
            </div>
            <div style={{ opacity: 0.9, fontSize: "1.1em" }}>
              Margen de Ganancia
            </div>
          </div>
        </div>
      </div>

      {/* Reportes por Modista */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaChartBar />
          <h3 className="st-inv-card-title">Reporte por Modistas</h3>
        </div>
        {reportesPorModista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No hay datos para mostrar en el período seleccionado
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "20px",
            }}
          >
            {reportesPorModista.map((reporte, index) => (
              <div
                key={index}
                style={{
                  background: "white",
                  border: "1px solid var(--st-border)",
                  borderLeft: "4px solid var(--st-primary)",
                  borderRadius: "var(--st-radius)",
                  padding: "20px",
                  boxShadow: "var(--st-shadow)",
                }}
              >
                {/* Header del reporte */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    paddingBottom: "15px",
                    borderBottom: "2px solid #f8f9fa",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: "var(--st-primary)",
                      fontSize: "1.3em",
                    }}
                  >
                    {reporte.nombre}
                  </h4>
                  <div
                    style={{
                      background: "#e8f5e8",
                      color: "var(--st-success)",
                      padding: "8px 15px",
                      borderRadius: "20px",
                      fontWeight: "600",
                    }}
                  >
                    ${reporte.totalPagar.toLocaleString()}
                  </div>
                </div>

                {/* Resumen de producción */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      background: "#f8f9fa",
                      padding: "15px",
                      borderRadius: "10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.8em",
                        fontWeight: "bold",
                        color: "var(--st-primary)",
                        marginBottom: "5px",
                      }}
                    >
                      {reporte.totalProductos}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      Productos Confeccionados
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#f8f9fa",
                      padding: "15px",
                      borderRadius: "10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.8em",
                        fontWeight: "bold",
                        color: "var(--st-primary)",
                        marginBottom: "5px",
                      }}
                    >
                      {reporte.planteles.size}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      Planteles Atendidos
                    </div>
                  </div>
                </div>

                {/* Desglose por productos */}
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      marginBottom: "10px",
                      color: "#333",
                    }}
                  >
                    Desglose por Productos
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    {Object.entries(reporte.productos).map(
                      ([producto, data], prodIndex) => (
                        <div
                          key={prodIndex}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "#f8f9fa",
                            borderRadius: "6px",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: "500" }}>{producto}</div>
                            <div style={{ color: "#666", fontSize: "0.9em" }}>
                              {data.cantidad} unidades
                            </div>
                          </div>
                          <div
                            style={{
                              color: "var(--st-success)",
                              fontWeight: "600",
                            }}
                          >
                            ${data.totalPagar.toLocaleString()}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla Detallada */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaChartBar />
          <h3 className="st-inv-card-title">Detalle de Transacciones</h3>
        </div>
        <div className="st-inv-table-wrapper">
          {datosFiltrados.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#666" }}
            >
              No hay transacciones para mostrar en el período seleccionado
            </div>
          ) : (
            <table className="st-inv-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Modista</th>
                  <th>Plantel</th>
                  <th>Producto</th>
                  <th>Talla</th>
                  <th>Cantidad</th>
                  <th>Precio Venta</th>
                  <th>Costo Confección</th>
                  <th>Ganancia</th>
                  <th>Margen %</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados
                  .sort((a, b) => {
                    const fechaA = a.fechaHora?.seconds
                      ? new Date(a.fechaHora.seconds * 1000)
                      : new Date(a.fechaHora || 0);
                    const fechaB = b.fechaHora?.seconds
                      ? new Date(b.fechaHora.seconds * 1000)
                      : new Date(b.fechaHora || 0);
                    return fechaB - fechaA;
                  })
                  .map((item, index) => {
                    const fecha = item.fechaHora?.seconds
                      ? new Date(item.fechaHora.seconds * 1000)
                      : new Date(item.fechaHora || Date.now());

                    const precioVenta =
                      (item.precio || 0) * (item.cantidad || 0);
                    const costoConfeccion = item.modista?.totalPagar || 0;
                    const ganancia = precioVenta - costoConfeccion;
                    const margen =
                      precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;

                    return (
                      <tr key={index}>
                        <td>{fecha.toLocaleDateString("es-CO")}</td>
                        <td>
                          {fecha.toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td>{item.modista?.nombre || "-"}</td>
                        <td>{item.colegio || "-"}</td>
                        <td>{item.prenda || "-"}</td>
                        <td>{item.talla || "-"}</td>
                        <td>{item.cantidad || 0}</td>
                        <td>${precioVenta.toLocaleString()}</td>
                        <td>${costoConfeccion.toLocaleString()}</td>
                        <td
                          style={{
                            color:
                              ganancia >= 0 ? "var(--st-success)" : "#dc2626",
                          }}
                        >
                          ${ganancia.toLocaleString()}
                        </td>
                        <td
                          style={{
                            color:
                              margen >= 0 ? "var(--st-success)" : "#dc2626",
                          }}
                        >
                          {margen.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportesModistas;
