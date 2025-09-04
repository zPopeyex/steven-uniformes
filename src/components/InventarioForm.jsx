// Ã°Å¸â€œâ€ž src/components/InventarioForm.jsx (MODIFICADO)
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";
import { FaUserTie } from "react-icons/fa";
import Escaner from "./Escaner.jsx";
import { GENERAL_ORDER, sizeInRange } from "../utils/sizes";

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
  const [catalogData, setCatalogData] = useState([]);
  const [modistas, setModistas] = useState([]);
  const [modistaSeleccionada, setModistaSeleccionada] = useState(null);
  const [showModistaInfo, setShowModistaInfo] = useState(false);
  // Origen (nuevo): modista | proveedor
  const [origen, setOrigen] = useState("modista");
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorSel, setProveedorSel] = useState(null);
  const [priceRules, setPriceRules] = useState([]);
  const [costoProveedorUnit, setCostoProveedorUnit] = useState(0);
  const [rangoAplicado, setRangoAplicado] = useState("");
  const [sinReglaProveedor, setSinReglaProveedor] = useState(false);
  const [costoManual, setCostoManual] = useState("");
  const [usarCostoManual, setUsarCostoManual] = useState(false);

  // Ã°Å¸â€œâ€ž Al cargar el formulario, extraer colegios, prendas y modistas
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar productos del catÃƒÂ¡logo
        const snapProductos = await getDocs(
          collection(db, "productos_catalogo")
        );
        const productos = snapProductos.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const colegiosUnicos = [...new Set(productos.map((p) => p.colegio))];
        const prendasUnicas = [...new Set(productos.map((p) => p.prenda))];

        setColegios(colegiosUnicos);
        setPrendas(prendasUnicas);
        setCatalogData(productos);

        // Cargar modistas
        const snapModistas = await getDocs(collection(db, "modistas"));
        const modistasData = snapModistas.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setModistas(modistasData);

        // Cargar proveedores
        const snapProv = await getDocs(collection(db, "proveedores"));
        const provs = snapProv.docs.map((d) => ({ id: d.id, ...d.data() }));
        provs.sort((a, b) => (a.empresa || "").localeCompare(b.empresa || ""));
        setProveedores(provs);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    cargarDatos();
  }, []);

  // Ã°Å¸Å¸Â¢ Si escanea, actualiza los valores automÃƒÂ¡ticamente
  useEffect(() => {
    if (productoEscaneado) {
      console.log("Producto escaneado recibido:", productoEscaneado);
      setProducto((prev) => ({
        ...prev,
        ...productoEscaneado,
      }));
    }
  }, [productoEscaneado]);

  // Actualizar informaciÃƒÂ³n de modista cuando se selecciona
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

  // Default para Arquidiocesanos: Origen=Proveedor y Proveedor=Bodega
  useEffect(() => {
    const col = (producto.colegio || "").toLowerCase();
    if (col.includes("arquidioces")) {
      setOrigen("proveedor");
      const bodega = proveedores.find(
        (p) => (p.empresa || "").toLowerCase() === "bodega"
      );
      if (bodega) setProveedorId(bodega.id);
    }
  }, [producto.colegio, proveedores]);

  // SelecciÃƒÂ³n del objeto proveedor
  useEffect(() => {
    const sel = proveedores.find((p) => p.id === proveedorId) || null;
    setProveedorSel(sel);
  }, [proveedores, proveedorId]);

  // Cargar reglas del proveedor seleccionado (subcolecciÃƒÂ³n priceRules)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!proveedorId) return setPriceRules([]);
      try {
        const { getDocs, collection } = await import("firebase/firestore");
        const snap = await getDocs(
          collection(db, "proveedores", proveedorId, "priceRules")
        );
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (mounted) setPriceRules(rows);
      } catch (e) {
        if (mounted) setPriceRules([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [proveedorId]);

  // Recalcular costo de proveedor segÃƒÂºn reglas y talla
  useEffect(() => {
    if (origen !== "proveedor") return;
    if (
      !producto.colegio ||
      !producto.prenda ||
      !producto.talla ||
      !producto.cantidad
    )
      return;
    if (!proveedorId) return;

    const now = Date.now();
    const matches = priceRules.filter((r) => {
      if (r.estado && String(r.estado).toLowerCase() !== "activo") return false;
      if (
        r.vigenciaDesde?.seconds &&
        new Date(r.vigenciaDesde.seconds * 1000).getTime() > now
      )
        return false;
      if (
        r.vigenciaHasta?.seconds &&
        new Date(r.vigenciaHasta.seconds * 1000).getTime() < now
      )
        return false;
      const coleg = (r.colegioId || r.colegio || "").trim();
      const prod = (r.productoId || r.prenda || r.producto || "").trim();
      if (coleg && coleg !== producto.colegio) return false;
      if (prod && prod !== producto.prenda) return false;
      return sizeInRange(
        producto.talla,
        r.tallaDesde,
        r.tallaHasta,
        GENERAL_ORDER
      );
    });

    if (!matches.length) {
      setSinReglaProveedor(true);
      if (usarCostoManual && costoManual) {
        setCostoProveedorUnit(Number(costoManual) || 0);
        setRangoAplicado("manual");
      } else {
        setCostoProveedorUnit(0);
        setRangoAplicado("");
      }
      return;
    }

    setSinReglaProveedor(false);
    // Elegir la regla de menor amplitud de rango
    const orderIdx = (sz) => GENERAL_ORDER.indexOf(String(sz).toUpperCase());
    const scored = matches.map((r) => {
      const s = Math.abs(orderIdx(r.tallaHasta) - orderIdx(r.tallaDesde));
      return { r, span: s };
    });
    scored.sort((a, b) => a.span - b.span);
    const best = scored[0].r;
    setCostoProveedorUnit(Number(best.precio) || 0);
    setRangoAplicado(`${best.tallaDesde}-${best.tallaHasta}`);
  }, [
    origen,
    proveedorId,
    priceRules,
    producto.colegio,
    producto.prenda,
    producto.talla,
    producto.cantidad,
    usarCostoManual,
    costoManual,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => {
      if (name === "colegio") {
        return { ...prev, colegio: value, prenda: "", talla: "", precio: "" };
      }
      if (name === "prenda") {
        return { ...prev, prenda: value, talla: "", precio: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  // Listas dependientes como en Ventas: colegio -> prenda -> talla
  const ORDEN_GENERAL = [
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];
  const ORDEN_PANTALON = [
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "28",
    "30",
    "32",
    "34",
    "36",
    "38",
    "40",
  ];
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const prendasFiltradas = useMemo(() => {
    if (!producto.colegio) return [];
    const set = new Set(
      catalogData
        .filter((p) => p.colegio === producto.colegio)
        .map((p) => p.prenda)
    );
    return Array.from(set).sort();
  }, [catalogData, producto.colegio]);

  const tallasFiltradas = useMemo(() => {
    if (!producto.colegio || !producto.prenda) return [];
    const list = catalogData
      .filter(
        (p) => p.colegio === producto.colegio && p.prenda === producto.prenda
      )
      .map((p) => p.talla)
      .filter(Boolean);
    const uniq = Array.from(new Set(list));
    const order =
      norm(producto.prenda) === "pantalon" ? ORDEN_PANTALON : ORDEN_GENERAL;
    return uniq.sort((a, b) => {
      const ia = order.indexOf(String(a));
      const ib = order.indexOf(String(b));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [catalogData, producto.colegio, producto.prenda]);

  // Autollenar precio desde catÃƒÂ¡logo al elegir talla
  useEffect(() => {
    if (producto.colegio && producto.prenda && producto.talla) {
      const item = catalogData.find(
        (p) =>
          p.colegio === producto.colegio &&
          p.prenda === producto.prenda &&
          p.talla === producto.talla
      );
      if (item && item.precio != null && item.precio !== "") {
        setProducto((prev) => ({ ...prev, precio: item.precio }));
      }
    }
  }, [producto.colegio, producto.prenda, producto.talla, catalogData]);

  const { role } = useAuth();

  // Calcular precio de confecciÃƒÂ³n y costo total
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

    // Validaciones segÃƒÂºn origen
    if (origen === "modista") {
      if (!modistaId) {
        alert("Debe seleccionar una modista");
        return;
      }
    } else if (origen === "proveedor") {
      if (!proveedorId && !(usarCostoManual && costoManual)) {
        alert("Seleccione un proveedor o confirme un costo manual");
        return;
      }
    }

    const base = {
      ...producto,
      precio: parseInt(precio),
      cantidad: parseInt(cantidad),
      origen,
    };

    if (origen === "modista") {
      base.modista = {
        id: modistaSeleccionada?.id || modistaId || "",
        nombre: modistaSeleccionada?.nombre || "",
        precioConfeccion: infoModista.precioUnitario,
        totalPagar: infoModista.totalPagar,
        habilidadUsada:
          infoModista.habilidadEncontrada?.nombre || "No definida",
      };
      base.modistaId = modistaSeleccionada?.id || modistaId || "";
      base.modistaNombre = modistaSeleccionada?.nombre || "";
      base.costoUnidad = infoModista.precioUnitario || 0;
      base.costoTotal = infoModista.totalPagar || 0;
    } else if (origen === "proveedor") {
      base.proveedorId = proveedorSel?.id || proveedorId || "";
      base.proveedorNombre = proveedorSel?.empresa || "";
      base.rangoAplicado = rangoAplicado || (usarCostoManual ? "manual" : "");
      const unit =
        usarCostoManual && costoManual
          ? Number(costoManual)
          : Number(costoProveedorUnit) || 0;
      base.costoUnidad = unit;
      base.costoTotal = unit * (parseInt(cantidad) || 0);
    }

    onAgregar(base);
  };

  // Verificar si el formulario estÃƒÂ¡ completo
  const isFormComplete = (() => {
    const common =
      producto.colegio &&
      producto.prenda &&
      producto.talla &&
      producto.precio &&
      producto.cantidad;
    if (!common) return false;
    if (origen === "modista") return !!producto.modistaId;
    if (origen === "proveedor")
      return !!proveedorId || (usarCostoManual && !!costoManual);
    return false;
  })();

  return (
    <div>
      <form onSubmit={handleSubmit} className="st-inv-form">
        <div className="st-inv-grid">
          <button
            type="button"
            className="st-inv-btn-ghost"
            onClick={onScanToggle}
            aria-label="Escanear codigo de barras"
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
            <span> Escanear codigo de barras</span>
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
            disabled={!producto.colegio}
          >
            <option value="">Producto</option>
            {prendasFiltradas.map((p, i) => (
              <option key={i} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            name="talla"
            value={producto.talla}
            onChange={handleChange}
            className="st-inv-field"
            aria-label="Talla"
            disabled={!producto.colegio || !producto.prenda}
          >
            <option value="">Talla</option>
            {tallasFiltradas.map((t, i) => (
              <option key={i} value={t}>
                {t}
              </option>
            ))}
          </select>
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

      {/* SecciÃƒÂ³n de Modista */}
      {producto.colegio &&
        producto.prenda &&
        producto.talla &&
        producto.cantidad &&
        producto.precio && (
          <div className="st-inv-card" style={{ marginTop: "20px" }}>
            <div className="st-inv-card-header">
              <FaUserTie />
              <h3 className="st-inv-card-title">Origen</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="st-inv-btn-ghost"
                  aria-pressed={origen === "modista"}
                  onClick={() => setOrigen("modista")}
                >
                  Modista
                </button>
                <button
                  type="button"
                  className="st-inv-btn-ghost"
                  aria-pressed={origen === "proveedor"}
                  onClick={() => setOrigen("proveedor")}
                >
                  Proveedor
                </button>
              </div>
            </div>

            {origen === "modista" && (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    color: "var(--st-text)",
                  }}
                >
                  Modista que confecciono este producto *
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
            )}
            {origen === "proveedor" && (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    color: "var(--st-text)",
                  }}
                >
                  Proveedor de esta compra *
                </label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="st-inv-field"
                  style={{ maxWidth: "400px" }}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.empresa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info proveedor: costo y total */}
            {origen === "proveedor" && proveedorId && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 15,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    background: "#e8f5e8",
                    padding: 15,
                    borderRadius: 8,
                    border: "1px solid var(--st-border)",
                    borderLeft: "4px solid var(--st-success)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 5,
                    }}
                  >
                    Precio por unidad
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--st-success)",
                    }}
                  >
                    {costoProveedorUnit > 0
                      ? costoProveedorUnit.toLocaleString()
                      : "No definido"}
                  </div>
                </div>
                <div
                  style={{
                    background: "#e8f5e8",
                    padding: 15,
                    borderRadius: 8,
                    border: "1px solid var(--st-border)",
                    borderLeft: "4px solid var(--st-success)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 5,
                    }}
                  >
                    Total a pagar
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--st-success)",
                    }}
                  >
                    {(
                      Number(costoProveedorUnit) *
                      (parseInt(producto.cantidad) || 0)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {origen === "proveedor" && sinReglaProveedor && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  color: "#856404",
                  padding: 15,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                No existe regla para esta talla.
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <label>Ingresar costo manual:</label>
                  <input
                    type="number"
                    className="st-inv-field"
                    style={{ width: 160 }}
                    value={costoManual}
                    onChange={(e) => setCostoManual(e.target.value)}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    className="st-inv-btn-primary"
                    onClick={() => setUsarCostoManual(true)}
                    disabled={!costoManual}
                  >
                    Confirmar
                  </button>
                  <a href="/proveedores" style={{ marginLeft: 8 }}>
                    Crear regla
                  </a>
                </div>
              </div>
            )}

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

            {/* InformaciÃƒÂ³n de la modista */}
            {origen === "modista" && showModistaInfo && modistaSeleccionada && (
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
                      Telefono
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
                    Esta modista no tiene un precio definido para "
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
