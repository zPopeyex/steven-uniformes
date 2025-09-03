import React, { useRef, useEffect, useState } from "react";
import CatalogToolbar from "../components/catalogo/CatalogToolbar.jsx";
import ColegioAccordion from "../components/catalogo/ColegioAccordion.jsx";
import ProductoAccordion from "../components/catalogo/ProductoAccordion.jsx";
import TallasTable from "../components/catalogo/TallasTable.jsx";
import "../styles/catalogo.css";
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
  const USE_MODERN_CATALOG = true;
  const onCancelEdit = () => {
    setProducto({ colegio: '', prenda: '', talla: '', precio: '' });
    setEditandoId(null);
  };
  const renderBarcode = (value, height = 28) => (
    <MiniBarcode value={value} height={height} />
  );

  if (!USE_MODERN_CATALOG) {
    return <div style={{ padding: 20 }}><h2>Cat�logo de Productos</h2></div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <CatalogToolbar
        producto={producto}
        editandoId={editandoId}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={onCancelEdit}
      />

      {productos.map((col) => {
        const abierto = !!productosExpandidos[col.colegio];
        const productosExpand = tallasExpandidas[col.colegio] || {};
        return (
          <ColegioAccordion
            key={col-} colegio={col.colegio} abierto={abierto} productosCount={col.productos.length}
            onToggle={() => setProductosExpandidos((p) => ({ ...p, [col.colegio]: !p[col.colegio] }))}
            onAdd={() => { setProducto({ colegio: col.colegio, prenda: '', talla: '', precio: '' }); setEditandoId(null); }}
          >
            {col.productos.map((p) => {
              const isOpen = !!productosExpand[p.prenda];
              return (
                <ProductoAccordion
                  key={prod--} producto={p.prenda} abierto={isOpen} tallasCount={p.tallas.length}
                  onToggle={() => setTallasExpandidas((prev) => ({ ...prev, [col.colegio]: { ...(prev[col.colegio] || {}), [p.prenda]: !isOpen } }))}
                  onAdd={() => { setProducto({ colegio: col.colegio, prenda: p.prenda, talla: '', precio: '' }); setEditandoId(null); }}
                >
                  <TallasTable
                    colegio={col.colegio} prenda={p.prenda} tallas={p.tallas}
                    renderBarcode={renderBarcode} onEditar={handleEditar} onEliminar={handleEliminar} onDescargar={descargarQR}
                  />
                </ProductoAccordion>
              );
            })}
          </ColegioAccordion>
        );
      })}
    </div>
  );
};

export default Catalogo;
