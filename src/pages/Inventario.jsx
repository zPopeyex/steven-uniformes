// 📄 src/pages/Inventario.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import InventarioForm from "../components/InventarioForm";
import InventarioTable from "../components/InventarioTable";

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const ref = collection(db, "inventario");
      const snapshot = await getDocs(ref);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔽 Ordenar por fecha descendente (si el campo existe)
const ordenado = data.sort((a, b) => b.timestamp - a.timestamp);


      setProductos(ordenado);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const agregarProducto = async (nuevoProducto) => {
    // 1. Guardar en inventario (historial completo)
    await addDoc(collection(db, "inventario"), nuevoProducto);

    // 2. Crear/actualizar inventario_stock
    const stockRef = collection(db, "inventario_stock");
    const q = query(
      stockRef,
      where("colegio", "==", nuevoProducto.colegio),
      where("prenda", "==", nuevoProducto.prenda),
      where("talla", "==", nuevoProducto.talla)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docExistente = snapshot.docs[0];
      const cantidadAnterior = docExistente.data().cantidad || 0;
      const nuevaCantidad = cantidadAnterior + nuevoProducto.cantidad;

      await updateDoc(doc(db, "inventario_stock", docExistente.id), {
        cantidad: nuevaCantidad,
        precio: nuevoProducto.precio,
        total: nuevaCantidad * nuevoProducto.precio,
        fecha: nuevoProducto.fecha,
        hora: nuevoProducto.hora,
        timestamp: nuevoProducto.timestamp,
      });
    } else {
      await addDoc(stockRef, {
        colegio: nuevoProducto.colegio,
        prenda: nuevoProducto.prenda,
        talla: nuevoProducto.talla,
        cantidad: nuevoProducto.cantidad,
        precio: nuevoProducto.precio,
        total: nuevoProducto.total,
        fecha: nuevoProducto.fecha,
        hora: nuevoProducto.hora,
        timestamp: nuevoProducto.timestamp,
      });
    }

    // 3. Recargar tabla principal
    cargarProductos();
  };

  const eliminarProducto = async (id) => {
    await deleteDoc(doc(db, "inventario", id));
    cargarProductos();
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>➕ Agregar Inventario</h2>

      <InventarioForm onAgregar={agregarProducto} />

      <hr style={{ margin: "20px 0" }} />

      {loading ? (
        <div
          style={{
            fontWeight: "bold",
            fontSize: "18px",
            backgroundColor: "#f4f4f4",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          ⏳ Cargando inventario...
        </div>
      ) : (
        <InventarioTable productos={productos} onEliminar={eliminarProducto} />
      )}
    </div>
  );
};

export default Inventario;
