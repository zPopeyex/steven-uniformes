// 📄 src/components/InventarioForm.jsx (MODIFICADO)
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";
import { FaUserTie } from "react-icons/fa";
import Escaner from "./Escaner.jsx";

const InventarioForm = ({
  onAgregar,
  productoEscaneado,
  mostrarEscaner,
  onScanToggle,
  onQRDetectado,
}) => {
  const [producto, setProducto] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
    cantidad: "",
    modistaId: "",
  });

  const [colegios, setColegios] = useState([]);
  const [prendas, setPrendas] = useState([]);
  const [modistas, setModistas] = useState([]);
  const [modistaSeleccionada, setModistaSeleccionada] = useState(null);
  const [showModistaInfo, setShowModistaInfo] = useState(false);

  // 📄 Al cargar el formulario, extraer colegios, prendas y modistas
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar productos del catálogo
        const snapProductos = await getDocs(
          collection(db, "productos_catalogo")
        );
        const productos = snapProductos.docs.map((doc) => doc.data());

        const colegiosUnicos = [...new Set(productos.map((p) => p.colegio))];
        const prendasUnicas = [...new Set(productos.map((p) => p.prenda))];

        setColegios(colegiosUnicos);
        setPrendas(prendasUnicas);

        // Cargar modistas
        const snapModistas = await getDocs(collection(db, "modistas"));
        const modistasData = snapModistas.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setModistas(modistasData);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    cargarDatos();
  }, []);

  // 🟢 Si escanea, actualiza los valores automáticamente
  useEffect(() => {
    if (productoEscaneado) {
      console.log("Producto escaneado recibido:", productoEscaneado);
      setProducto((prev) => ({
        ...prev,
        ...productoEscaneado,
      }));
    }
  }, [productoEscaneado]);

  // Actualizar información de modista cuando se selecciona
  useEffect(() => {
    if (producto.modistaId) {
      const modista = modistas.find((m) => m.id === producto.modistaId);
      setModistaSeleccionada(modista);
      setShowModistaInfo(!!modista);
    } else {
      setModistaSeleccionada(null);
      setShowModistaInfo(false);
    }
  }, [producto.modistaId, modistas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };

  const { role } = useAuth();

  // Calcular precio de confección y costo total
  const calcularInfoModista = () => {
    if (!modistaSeleccionada || !producto.prenda || !producto.cantidad) {
      return { precioUnitario: 0, totalPagar: 0, habilidadEncontrada: null };
    }

    // Buscar la habilidad que coincida con el producto
    const habilidad = modistaSeleccionada.habilidades.find(
      (h) =>
        h.nombre.toLowerCase().includes(producto.prenda.toLowerCase()) ||
        producto.prenda.toLowerCase().includes(h.nombre.toLowerCase())
    );

    if (habilidad) {
      const cantidad = parseInt(producto.cantidad) || 0;
      return {
        precioUnitario: habilidad.precio,
        totalPagar: habilidad.precio * cantidad,
        habilidadEncontrada: habilidad,
      };
    }

    return { precioUnitario: 0, totalPagar: 0, habilidadEncontrada: null };
  };

  const infoModista = calcularInfoModista();

  const handleSubmit = (e) => {
    e.preventDefault();
    const { colegio, prenda, talla, precio, cantidad, modistaId } = producto;

    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }

    if (!colegio || !prenda || !talla || !precio || !cantidad) {
      alert("Completa todos los campos del producto");
      return;
    }

    if (!modistaId) {
      alert("Debe seleccionar una modista");
      return;
    }

    const productoFinal = {
      ...producto,
      precio: parseInt(precio),
      cantidad: parseInt(cantidad),
      modista: {
        id: modistaSeleccionada.id,
        nombre: modistaSeleccionada.nombre,
        precioConfeccion: infoModista.precioUnitario,
        totalPagar: infoModista.totalPagar,
        habilidadUsada:
          infoModista.habilidadEncontrada?.nombre || "No definida",
      },
    };

    onAgregar(productoFinal);
  };

  // Verificar si el formulario está completo
  const isFormComplete =
    producto.colegio &&
    producto.prenda &&
    producto.talla &&
    producto.precio &&
    producto.cantidad &&
    producto.modistaId;

  return (
    <div>
      <form onSubmit={handleSubmit} className="st-inv-form">
        <div className="st-inv-grid">
          <button
            type="button"
            className="st-inv-btn-ghost"
            onClick={onScanToggle}
            aria-label="Escanear código de barras"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <span> Escanear código de barras</span>
          </button>
          <select
            name="colegio"
            value={producto.colegio}
            onChange={handleChange}
            className="st-inv-field"
            aria-label="Plantel"
          >
            <option value="">Plantel</option>
            {colegios.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="prenda"
            value={producto.prenda}
            onChange={handleChange}
            className="st-inv-field"
            aria-label="Producto"
          >
            <option value="">Producto</option>
            {prendas.map((p, i) => (
              <option key={i} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            name="talla"
            value={producto.talla}
            onChange={handleChange}
            placeholder="Talla"
            aria-label="Talla"
            className="st-inv-field"
          />
          <input
            name="cantidad"
            value={producto.cantidad}
            onChange={handleChange}
            placeholder="Cantidad"
            type="number"
            aria-label="Cantidad"
            className="st-inv-field"
          />
          <input
            name="precio"
            value={producto.precio}
            onChange={handleChange}
            placeholder="Precio"
            type="number"
            aria-label="Precio"
            className="st-inv-field"
          />
          <button
            type="submit"
            className="st-inv-btn-primary"
            disabled={!isFormComplete}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>+ Agregar al inventario</span>
          </button>
        </div>
        {mostrarEscaner && (
          <div className="st-inv-scanner">
            <Escaner onScan={onQRDetectado} useCamera={true} />
          </div>
        )}
      </form>

      {/* Sección de Modista */}
      {producto.colegio &&
        producto.prenda &&
        producto.talla &&
        producto.cantidad &&
        producto.precio && (
          <div className="st-inv-card" style={{ marginTop: "20px" }}>
            <div className="st-inv-card-header">
              <FaUserTie />
              <h3 className="st-inv-card-title">Seleccionar Modista</h3>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Modista que confeccionó este producto *
              </label>
              <select
                name="modistaId"
                value={producto.modistaId}
                onChange={handleChange}
                className="st-inv-field"
                style={{ maxWidth: "400px" }}
              >
                <option value="">Seleccionar modista...</option>
                {modistas.map((modista) => (
                  <option key={modista.id} value={modista.id}>
                    {modista.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Vista previa del producto */}
            <div
              style={{
                background: "#e3f2fd",
                border: "2px solid var(--st-primary)",
                borderRadius: "var(--st-radius)",
                padding: "15px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  color: "var(--st-primary)",
                  marginBottom: "10px",
                }}
              >
                Vista Previa del Producto
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontWeight: "500" }}>Plantel:</span>
                  <span>{producto.colegio}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontWeight: "500" }}>Producto:</span>
                  <span>{producto.prenda}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontWeight: "500" }}>Talla:</span>
                  <span>{producto.talla}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontWeight: "500" }}>Cantidad:</span>
                  <span>{producto.cantidad}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontWeight: "500" }}>Precio Total:</span>
                  <span>
                    $
                    {(
                      (parseInt(producto.cantidad) || 0) *
                      (parseInt(producto.precio) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de la modista */}
            {showModistaInfo && modistaSeleccionada && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid var(--st-border)",
                      borderLeft: "4px solid var(--st-primary)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "5px",
                      }}
                    >
                      Nombre
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>
                      {modistaSeleccionada.nombre}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid var(--st-border)",
                      borderLeft: "4px solid var(--st-primary)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "5px",
                      }}
                    >
                      Teléfono
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>
                      {modistaSeleccionada.telefono || "No registrado"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#e8f5e8",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid var(--st-border)",
                      borderLeft: "4px solid var(--st-success)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "5px",
                      }}
                    >
                      Precio por unidad
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "var(--st-success)",
                      }}
                    >
                      {infoModista.habilidadEncontrada
                        ? `${infoModista.precioUnitario.toLocaleString()}`
                        : "Precio no definido"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#e8f5e8",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid var(--st-border)",
                      borderLeft: "4px solid var(--st-success)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "5px",
                      }}
                    >
                      Total a pagar
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "var(--st-success)",
                      }}
                    >
                      {infoModista.habilidadEncontrada
                        ? `${infoModista.totalPagar.toLocaleString()}`
                        : "Precio no definido"}
                    </div>
                  </div>
                </div>

                {!infoModista.habilidadEncontrada && (
                  <div
                    style={{
                      background: "#fff3cd",
                      border: "1px solid #ffeaa7",
                      color: "#856404",
                      padding: "15px",
                      borderRadius: "8px",
                      marginTop: "15px",
                    }}
                  >
                    ⚠️ Esta modista no tiene un precio definido para "
                    {producto.prenda}". Considera agregar esta habilidad a su
                    perfil.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default InventarioForm;
