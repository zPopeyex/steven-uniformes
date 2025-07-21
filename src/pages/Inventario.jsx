// 📄 src/pages/Inventario.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import InventarioForm from "../components/InventarioForm";
import InventarioTable from "../components/InventarioTable";
import Escaner from "../components/Escaner";

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoInicial, setProductoInicial] = useState(null);

  const cargarInventario = async () => {
    const snap = await getDocs(collection(db, "inventario"));
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setInventario(docs);
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // ✅ Escaneo de QR
  const handleQRDetectado = (codigo) => {
    if (!codigo) return;
    const partes = codigo.split("-");
    const [colegio, prenda, talla, precio] = partes;
    if (colegio && prenda && talla && precio) {
      setProductoInicial({
        colegio,
        prenda,
        talla,
        precio,
        cantidad: "",
      });
      console.log("Producto QR escaneado:", { colegio, prenda, talla, precio });
      setMostrarEscaner(false);
    } else {
      alert("El código QR no tiene el formato esperado.");
    }
  };

  // ✅ Agregar al inventario y también al stock_actual
  const handleAgregarInventario = async (productoFinal) => {
    try {
      await addDoc(collection(db, "inventario"), {
        ...productoFinal,
        fechaHora: new Date(), // Guarda fecha y hora exacta de forma legible
      });

      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", productoFinal.colegio),
        where("prenda", "==", productoFinal.prenda),
        where("talla", "==", productoFinal.talla)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        // No existe en stock, crear nuevo
        await addDoc(collection(db, "stock_actual"), {
          ...productoFinal,
          cantidad: parseInt(productoFinal.cantidad || 1),
        });
      } else {
        // Existe, actualizar cantidad sumando
        const docRef = snap.docs[0].ref;
        const data = snap.docs[0].data();
        await updateDoc(docRef, {
          cantidad:
            parseInt(data.cantidad || 0) +
            parseInt(productoFinal.cantidad || 1),
        });
      }

      cargarInventario();
      setProductoInicial(null);
    } catch (error) {
      console.error("Error al guardar en inventario:", error);
    }
  };

  // ✅ Eliminar de inventario y RESTAR del stock_actual
  const handleEliminar = async (id) => {
    try {
      const docRef = doc(db, "inventario", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const producto = docSnap.data();

      // Buscar el producto en stock_actual
      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", producto.colegio),
        where("prenda", "==", producto.prenda),
        where("talla", "==", producto.talla)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        const stockData = stockDoc.data();
        const nuevaCantidad =
          parseInt(stockData.cantidad || 0) - parseInt(producto.cantidad || 1);

        if (nuevaCantidad > 0) {
          await updateDoc(stockDoc.ref, { cantidad: nuevaCantidad });
        } else {
          await deleteDoc(stockDoc.ref);
        }
      }

      // Eliminar del inventario
      await deleteDoc(docRef);
      cargarInventario();
    } catch (err) {
      console.error("Error eliminando producto:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Agregar al Inventario</h2>

      <button
        onClick={() => setMostrarEscaner((prev) => !prev)}
        style={{
          padding: "10px 20px",
          marginBottom: 10,
          borderRadius: 8,
          backgroundColor: "#cde",
          cursor: "pointer",
        }}
      >
        {mostrarEscaner ? "❌ Cerrar Escáner" : "📷 Escanear QR"}
      </button>

      {mostrarEscaner && <Escaner onScan={handleQRDetectado} />}

      <InventarioForm
        productoEscaneado={productoInicial}
        onAgregar={handleAgregarInventario}
      />

      <InventarioTable productos={inventario} onEliminar={handleEliminar} />
    </div>
  );
};

export default Inventario;
