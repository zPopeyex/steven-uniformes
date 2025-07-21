import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import QRCodeLib from "qrcode"; // al principio del archivo

const Catalogo = () => {
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
  });
  const [editandoId, setEditandoId] = useState(null);

  const cargarCatalogo = async () => {
    const snap = await getDocs(collection(db, "productos_catalogo"));
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProductos(docs);
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

    if (editandoId) {
      await updateDoc(doc(db, "productos_catalogo", editandoId), producto);
      setEditandoId(null);
    } else {
      await addDoc(collection(db, "productos_catalogo"), producto);
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

  const descargarQR = async (contenido, nombreArchivo) => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(contenido, {
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 10,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      const link = document.createElement("a");
      link.download = `${nombreArchivo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al generar imagen QR:", err);
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
        />
        <input
          name="prenda"
          value={producto.prenda}
          onChange={handleChange}
          placeholder="Producto"
        />
        <input
          name="talla"
          value={producto.talla}
          onChange={handleChange}
          placeholder="Talla"
        />
        <input
          name="precio"
          value={producto.precio}
          onChange={handleChange}
          placeholder="Precio"
          type="number"
        />
        <button type="submit">{editandoId ? "Actualizar" : "Agregar"}</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Colegio</th>
            <th>Producto</th>
            <th>Talla</th>
            <th>Precio</th>
            <th>QR</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.colegio}</td>
              <td>{prod.prenda}</td>
              <td>{prod.talla}</td>
              <td>{parseInt(prod.precio).toLocaleString("es-CO")}</td>
              <td>
                <div
                  id={`qr-${prod.id}`}
                  style={{
                    display: "inline-block",
                    backgroundColor: "#ffffff",
                    padding: "0",
                    margin: "0",
                    lineHeight: "0",
                    width: "auto",
                  }}
                >
                  <QRCode
                    value={`${prod.colegio}-${prod.prenda}-${prod.talla}-${prod.precio}`}
                    size={64} // aumenta tamaño real
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                  />
                </div>
              </td>
              <td>
                <button onClick={() => handleEditar(prod)}>Editar</button>{" "}
                <button
                  onClick={() => handleEliminar(prod.id)}
                  style={{ color: "red" }}
                >
                  Eliminar
                </button>{" "}
                <button
                  onClick={() =>
                    descargarQR(
                      `${prod.colegio}-${prod.prenda}-${prod.talla}-${prod.precio}`,
                      `qr_${prod.colegio}-${prod.prenda}-${prod.talla}`
                    )
                  }
                >
                  📥
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Catalogo;
