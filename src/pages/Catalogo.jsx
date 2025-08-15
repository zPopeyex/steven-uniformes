import React, { useRef, useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import QRCode from "react-qr-code"; // <- ya no se usa, lo dejamos para no romper nada (puedes quitarlo luego)
import QRCodeLib from "qrcode"; // <- ya no se usa en descargar, lo dejamos igual
import CardTable from "../components/CardTable";
import JsBarcode from "jsbarcode";

const Catalogo = () => {
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [productosExpandidos, setProductosExpandidos] = useState({});
  const [tallasExpandidas, setTallasExpandidas] = useState({});

  // --- Mini preview de código de barras (para la tabla) ---
  const MiniBarcode = ({ value, height = 28 }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current || !value) return;
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          height,
        });
      } catch (e) {
        // noop
      }
    }, [value, height]);
    return (
      <svg
        ref={ref}
        style={{ width: 120, height: height + 4, display: "block" }}
      />
    );
  };

  const cargarCatalogo = async () => {
    const snap = await getDocs(collection(db, "productos_catalogo"));
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Agrupar por colegio y luego producto
    const colegiosAgrupados = {};
    docs.forEach((item) => {
      if (!colegiosAgrupados[item.colegio]) {
        colegiosAgrupados[item.colegio] = {};
      }
      if (!colegiosAgrupados[item.colegio][item.prenda]) {
        colegiosAgrupados[item.colegio][item.prenda] = [];
      }
      colegiosAgrupados[item.colegio][item.prenda].push({
        talla: item.talla,
        precio: item.precio,
        id: item.id,
      });
    });

    const ordenTallas = [
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
    const colegiosArray = Object.keys(colegiosAgrupados)
      .sort()
      .map((colegio) => ({
        colegio,
        productos: Object.keys(colegiosAgrupados[colegio])
          .sort()
          .map((prenda) => ({
            prenda,
            tallas: Array.isArray(colegiosAgrupados[colegio][prenda])
              ? [...colegiosAgrupados[colegio][prenda]].sort((a, b) => {
                  const ia = ordenTallas.indexOf(a.talla);
                  const ib = ordenTallas.indexOf(b.talla);
                  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                })
              : [],
          })),
      }));

    setProductos(colegiosArray);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { colegio, prenda, talla, precio } = producto;

    if (!colegio || !prenda || !talla || !precio) {
      alert("Completa todos los campos");
      return;
    }

    // Mantener el MISMO patrón que ya usabas en tus QR (aquí: con guiones)
    const codeValue = `${colegio}-${prenda}-${talla}-${precio}`;

    if (editandoId) {
      await updateDoc(doc(db, "productos_catalogo", editandoId), {
        ...producto,
        barcode: codeValue, // <-- nuevo campo (compatibilidad: no borra otros)
      });
      setEditandoId(null);
    } else {
      await addDoc(collection(db, "productos_catalogo"), {
        ...producto,
        barcode: codeValue, // <-- nuevo campo
      });
    }

    setProducto({ colegio: "", prenda: "", talla: "", precio: "" });
    cargarCatalogo();
  };

  const handleEditar = (prod) => {
    setProducto({ ...prod });
    setEditandoId(prod.id);
  };

  const handleEliminar = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
      await deleteDoc(doc(db, "productos_catalogo", id));
      cargarCatalogo();
    }
  };

  // Mantengo el nombre "descargarQR" pero ahora genera CÓDIGO DE BARRAS (Code128)
  const descargarQR = async (contenido, nombreArchivo) => {
    try {
      // 1) Generar SVG temporal con JsBarcode
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, contenido, {
        format: "CODE128",
        displayValue: true,
        fontSize: 16,
        margin: 10,
        height: 120,
      });

      // 2) Convertir a PNG y descargar (mismo nombre que ya usabas)
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const link = document.createElement("a");
        link.download = `${nombreArchivo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = svg64;
    } catch (err) {
      console.error("Error al generar código de barras:", err);
    }
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📘 Catálogo de Productos</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "10px", marginBottom: 20 }}
      >
        <input
          name="colegio"
          value={producto.colegio}
          onChange={handleChange}
          placeholder="Colegio"
          required
        />
        <input
          name="prenda"
          value={producto.prenda}
          onChange={handleChange}
          placeholder="Producto"
          required
        />
        <input
          name="talla"
          value={producto.talla}
          onChange={handleChange}
          placeholder="Talla"
          required
        />
        <input
          name="precio"
          value={producto.precio}
          onChange={handleChange}
          placeholder="Precio"
          type="number"
          required
          min="0"
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: editandoId ? "#4CAF50" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {editandoId ? "Actualizar" : "Agregar"}
        </button>
        {editandoId && (
          <button
            type="button"
            onClick={() => {
              setProducto({ colegio: "", prenda: "", talla: "", precio: "" });
              setEditandoId(null);
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <tbody>
            {/* ⚠️ Antes había un <div> directo dentro de <tbody>; eso es inválido */}
            <tr>
              <td colSpan={4} style={{ padding: 0, border: 0 }}>
                <div>
                  {productos.map((colegioObj) => {
                    const colegioExpandido =
                      productosExpandidos[colegioObj.colegio];
                    const productosExpandido =
                      tallasExpandidas[colegioObj.colegio] || {};

                    return (
                      <CardTable
                        key={`col-card-${colegioObj.colegio}`}
                        title={
                          <button
                            onClick={() =>
                              setProductosExpandidos((prev) => ({
                                ...prev,
                                [colegioObj.colegio]: !prev[colegioObj.colegio],
                              }))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "1.13em",
                              color: "#1976d2",
                              letterSpacing: "0.5px",
                              padding: 0,
                            }}
                          >
                            {colegioExpandido ? "▼" : "▶"} {colegioObj.colegio}
                          </button>
                        }
                        color="#e3e9ff"
                      >
                        {colegioExpandido && (
                          <div>
                            {colegioObj.productos.map((prod) => {
                              const isOpen = productosExpandido[prod.prenda];
                              return (
                                <div
                                  key={`prod-card-${colegioObj.colegio}-${prod.prenda}`}
                                  style={{
                                    margin: "14px 0",
                                    background: "#fff",
                                    borderRadius: "8px",
                                    boxShadow: "0 1px 4px #1976d210",
                                    padding: "9px 16px",
                                  }}
                                >
                                  {/* Header producto colapsable */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      marginBottom: isOpen ? "8px" : 0,
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        setTallasExpandidas((prev) => ({
                                          ...prev,
                                          [colegioObj.colegio]: {
                                            ...((prev &&
                                              prev[colegioObj.colegio]) ||
                                              {}),
                                            [prod.prenda]: !isOpen,
                                          },
                                        }))
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1.09em",
                                        marginRight: 7,
                                        color: "#212d45",
                                      }}
                                    >
                                      {isOpen ? "▼" : "▶"}
                                    </button>
                                    <div
                                      style={{
                                        fontWeight: "bold",
                                        fontSize: "1.08em",
                                        color: "#212d45",
                                      }}
                                    >
                                      {prod.prenda}
                                    </div>
                                    <div style={{ flex: 1 }} />
                                    <button
                                      onClick={() => {
                                        setProducto({
                                          colegio: colegioObj.colegio,
                                          prenda: prod.prenda,
                                          talla: "",
                                          precio: "",
                                        });
                                        setEditandoId(null);
                                      }}
                                      style={{
                                        padding: "6px 15px",
                                        backgroundColor: "#1976d2",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        fontSize: "1em",
                                      }}
                                    >
                                      + Agregar Talla
                                    </button>
                                  </div>

                                  {/* Tallas como tabla, solo cuando abierto */}
                                  {isOpen && (
                                    <table
                                      style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        background: "#f9faff",
                                        marginTop: 4,
                                        borderRadius: 5,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <thead>
                                        <tr style={{ background: "#dde6fa" }}>
                                          <th style={{ padding: "8px" }}>
                                            Talla
                                          </th>
                                          <th style={{ padding: "8px" }}>
                                            Precio
                                          </th>
                                          <th style={{ padding: "8px" }}>
                                            Código de barras
                                          </th>
                                          <th style={{ padding: "8px" }}>
                                            Acciones
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {prod.tallas.map((t) => {
                                          const codeValue = `${colegioObj.colegio}-${prod.prenda}-${t.talla}-${t.precio}`;
                                          return (
                                            <tr
                                              key={`talla-${colegioObj.colegio}-${prod.prenda}-${t.id}`}
                                            >
                                              <td
                                                style={{
                                                  padding: "8px",
                                                  borderBottom:
                                                    "1px solid #e3e9ff",
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {t.talla}
                                              </td>
                                              <td
                                                style={{
                                                  padding: "8px",
                                                  borderBottom:
                                                    "1px solid #e3e9ff",
                                                }}
                                              >
                                                $
                                                {parseInt(
                                                  t.precio
                                                ).toLocaleString("es-CO")}
                                              </td>
                                              <td
                                                style={{
                                                  padding: "8px",
                                                  borderBottom:
                                                    "1px solid #e3e9ff",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "inline-block",
                                                    padding: "2px",
                                                    backgroundColor: "white",
                                                    border: "1px solid #ddd",
                                                  }}
                                                >
                                                  <MiniBarcode
                                                    value={codeValue}
                                                    height={28}
                                                  />
                                                </div>
                                              </td>
                                              <td
                                                style={{
                                                  padding: "8px",
                                                  borderBottom:
                                                    "1px solid #e3e9ff",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "7px",
                                                  }}
                                                >
                                                  <button
                                                    onClick={() =>
                                                      handleEditar({
                                                        id: t.id,
                                                        colegio:
                                                          colegioObj.colegio,
                                                        prenda: prod.prenda,
                                                        talla: t.talla,
                                                        precio: t.precio,
                                                      })
                                                    }
                                                    style={{
                                                      padding: "5px 10px",
                                                      backgroundColor:
                                                        "#FFC107",
                                                      color: "black",
                                                      border: "none",
                                                      borderRadius: "3px",
                                                      cursor: "pointer",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    Editar
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      handleEliminar(t.id)
                                                    }
                                                    style={{
                                                      padding: "5px 10px",
                                                      backgroundColor:
                                                        "#f44336",
                                                      color: "white",
                                                      border: "none",
                                                      borderRadius: "3px",
                                                      cursor: "pointer",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    Eliminar
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      descargarQR(
                                                        codeValue,
                                                        `barcode_${colegioObj.colegio}_${prod.prenda}_${t.talla}`
                                                      )
                                                    }
                                                    style={{
                                                      padding: "5px 10px",
                                                      backgroundColor:
                                                        "#4CAF50",
                                                      color: "white",
                                                      border: "none",
                                                      borderRadius: "3px",
                                                      cursor: "pointer",
                                                      fontWeight: 500,
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "4px",
                                                    }}
                                                  >
                                                    <span>
                                                      Descargar barras
                                                    </span>
                                                    <span>📥</span>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardTable>
                    );
                  })}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Catalogo;
