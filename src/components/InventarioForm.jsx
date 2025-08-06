// 📄 src/components/InventarioForm.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../contexts/AuthContext.jsx";

const InventarioForm = ({ onAgregar, productoEscaneado }) => {
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
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select name="colegio" value={producto.colegio} onChange={handleChange}>
          <option value="">Nombre plantel</option>
          {colegios.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        <select name="prenda" value={producto.prenda} onChange={handleChange}>
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
        />
        <input
          name="cantidad"
          value={producto.cantidad}
          onChange={handleChange}
          placeholder="Cantidad"
          type="number"
        />
        <input
          name="precio"
          value={producto.precio}
          onChange={handleChange}
          placeholder="Precio"
          type="number"
        />
      </div>
      <button type="submit" style={{ marginTop: 10 }}>
        ➕ Agregar al inventario
      </button>
    </form>
  );
};

export default InventarioForm;
