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
import QRCodeLib from "qrcode";

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

  const cargarCatalogo = async () => {
    const snap = await getDocs(collection(db, "productos_catalogo"));
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    // Agrupar productos por colegio y prenda
    const productosAgrupados = docs.reduce((acc, curr) => {
      const key = `${curr.colegio}-${curr.prenda}`;
      if (!acc[key]) {
        acc[key] = {
          colegio: curr.colegio,
          prenda: curr.prenda,
          tallas: [],
          id: curr.id.split('-')[0] // Tomamos parte del ID para el grupo
        };
      }
      acc[key].tallas.push({
        talla: curr.talla,
        precio: curr.precio,
        id: curr.id
      });
      return acc;
    }, {});

    // Ordenar tallas según el criterio especificado
    const ordenTallas = ['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'];
    Object.keys(productosAgrupados).forEach(key => {
      productosAgrupados[key].tallas.sort((a, b) => {
        const indexA = ordenTallas.indexOf(a.talla);
        const indexB = ordenTallas.indexOf(b.talla);
        return indexA - indexB;
      });
    });

    setProductos(Object.values(productosAgrupados));
  };

  const toggleExpandirProducto = (productoKey) => {
    setProductosExpandidos(prev => ({
      ...prev,
      [productoKey]: !prev[productoKey]
    }));
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
            cursor: "pointer"
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
              cursor: "pointer"
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Colegio</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Producto</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Tallas</th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => {
              const productoKey = `${prod.colegio}-${prod.prenda}`;
              const estaExpandido = productosExpandidos[productoKey];
              
              return (
                <React.Fragment key={productoKey}>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "12px" }}>{prod.colegio}</td>
                    <td style={{ padding: "12px" }}>{prod.prenda}</td>
                    <td style={{ padding: "12px" }}>
                      <button 
                        onClick={() => toggleExpandirProducto(productoKey)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span style={{ fontSize: "1.2em" }}>
                          {estaExpandido ? '▼' : '▶'}
                        </span>
                        <span>
                          {prod.tallas.length} talla{prod.tallas.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button 
                        onClick={() => {
                          setProducto({
                            colegio: prod.colegio,
                            prenda: prod.prenda,
                            talla: "",
                            precio: ""
                          });
                          setEditandoId(null);
                        }}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginRight: "8px"
                        }}
                      >
                        + Agregar Talla
                      </button>
                    </td>
                  </tr>
                  
                  {estaExpandido && prod.tallas.map((t) => (
                    <tr key={t.id} style={{ backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: "12px" }}></td>
                      <td style={{ padding: "12px" }}></td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <span style={{ fontWeight: "bold", minWidth: "60px" }}>Talla: {t.talla}</span>
                          <span>Precio: ${parseInt(t.precio).toLocaleString("es-CO")}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ 
                            display: 'inline-block', 
                            marginRight: '10px',
                            padding: '4px',
                            backgroundColor: 'white',
                            border: '1px solid #ddd'
                          }}>
                            <QRCode
                              value={`${prod.colegio}-${prod.prenda}-${t.talla}-${t.precio}`}
                              size={48}
                              bgColor="#ffffff"
                              fgColor="#000000"
                              level="H"
                            />
                          </div>
                          <button 
                            onClick={() => handleEditar({
                              id: t.id,
                              colegio: prod.colegio,
                              prenda: prod.prenda,
                              talla: t.talla,
                              precio: t.precio
                            })}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#FFC107",
                              color: "black",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(t.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginLeft: "8px"
                            }}
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={() =>
                              descargarQR(
                                `${prod.colegio}-${prod.prenda}-${t.talla}-${t.precio}`,
                                `qr_${prod.colegio}_${prod.prenda}_${t.talla}`
                              )
                            }
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#4CAF50",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginLeft: "8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>QR</span>
                            <span>📥</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Catalogo;