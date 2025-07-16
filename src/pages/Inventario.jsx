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
  getDoc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import InventarioForm from "../components/InventarioForm";
import InventarioTable from "../components/InventarioTable";


const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [primeraCarga, setPrimeraCarga] = useState(true);


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
  try {
    // 1. Obtener el documento que se va a eliminar del historial
    const docRef = doc(db, 'inventario', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn('El producto no existe en el historial');
      return;
    }

    const producto = docSnap.data();

    // 2. Buscar en el stock el producto con misma combinación
    const stockRef = collection(db, 'inventario_stock');
    const q = query(
      stockRef,
      where('colegio', '==', producto.colegio),
      where('prenda', '==', producto.prenda),
      where('talla', '==', producto.talla)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docExistente = snapshot.docs[0];
      const stock = docExistente.data();
      const cantidadAnterior = stock.cantidad || 0;
      const nuevaCantidad = cantidadAnterior - producto.cantidad;

      if (nuevaCantidad <= 0) {
        // Si la cantidad queda en 0, dejar valores en 0
        await updateDoc(doc(db, 'inventario_stock', docExistente.id), {
          cantidad: 0,
          total: 0,
          precio: null
        });
      } else {
        const precioUnitario = stock.precio || 0;
        const nuevoTotal = nuevaCantidad * precioUnitario;

        await updateDoc(doc(db, 'inventario_stock', docExistente.id), {
          cantidad: nuevaCantidad,
          total: nuevoTotal
        });
      }
    }

    // 3. Eliminar del historial
    await deleteDoc(docRef);

    // 4. Recargar tabla
    cargarProductos();

  } catch (error) {
    console.error('Error al eliminar y actualizar stock:', error);
  }
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
