// 📄 src/components/InventarioForm.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";
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
  });

  const [colegios, setColegios] = useState([]);
  const [prendas, setPrendas] = useState([]);

  // 🔄 Al cargar el formulario, extraer colegios y prendas únicas del catálogo
  useEffect(() => {
    const cargarDatos = async () => {
      const snap = await getDocs(collection(db, "productos_catalogo"));
      const docs = snap.docs.map((doc) => doc.data());

      const colegiosUnicos = [...new Set(docs.map((p) => p.colegio))];
      const prendasUnicas = [...new Set(docs.map((p) => p.prenda))];

      setColegios(colegiosUnicos);
      setPrendas(prendasUnicas);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };
  const { role } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    const { colegio, prenda, talla, precio, cantidad } = producto;

    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }

    if (!colegio || !prenda || !talla || !precio || !cantidad) {
      alert("Completa todos los campos");
      return;
    }

    const productoFinal = {
      ...producto,
      precio: parseInt(precio),
      cantidad: parseInt(cantidad),
    };

    onAgregar(productoFinal);
  };

  return (
    <form onSubmit={handleSubmit} className="st-inv-form">
      <div className="st-inv-grid">
        <button
          type="button"
          className="st-inv-btn-ghost"
          onClick={onScanToggle}
          aria-label="Escanear código QR"
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
          <span>Escanear QR</span>
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
            <option key={i} value={c}>{c}</option>
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
            <option key={i} value={p}>{p}</option>
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
        <button type="submit" className="st-inv-btn-primary">
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
          <Escaner onScan={onQRDetectado} />
        </div>
      )}
    </form>
  );
};

export default InventarioForm;
