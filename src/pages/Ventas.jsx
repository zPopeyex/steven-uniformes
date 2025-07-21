import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, query, where} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import VentasForm from "../components/VentasForm";
import VentasTable from "../components/VentasTable";
import Escaner from "../components/Escaner";

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoEscaneado, setProductoEscaneado] = useState(null);

  // Cargar ventas al iniciar
  const cargarVentas = async () => {
    const snap = await getDocs(collection(db, "ventas"));
    setVentas(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  // Escanear QR (mismo que en Inventario)
  const handleQRDetectado = (codigo) => {
    const partes = codigo.split("-");
    const [colegio, prenda, talla, precio] = partes;
    if (colegio && prenda && talla && precio) {
      setProductoEscaneado({
        colegio,
        prenda,
        talla,
        precio,
      });
      setMostrarEscaner(false);
    }
  };

  // Registrar venta y actualizar stock
  const handleAgregarVenta = async (venta) => {
    try {
      // 1. Guardar en "ventas"
      await addDoc(collection(db, "ventas"), {
        ...venta,
        fechaHora: new Date(), // Timestamp automático
      });

      // 2. Restar del stock
      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", venta.colegio),
        where("prenda", "==", venta.prenda),
        where("talla", "==", venta.talla)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        await updateDoc(stockDoc.ref, {
          cantidad: stockDoc.data().cantidad - venta.cantidad,
        });
      }

      cargarVentas();
    } catch (error) {
      console.error("Error al registrar venta:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>💰 Registrar Venta/Encargo</h2>
      
      <button 
        onClick={() => setMostrarEscaner(!mostrarEscaner)}
        style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px" }}
      >
        {mostrarEscaner ? "❌ Cerrar Escáner" : "📷 Escanear QR"}
      </button>

      {mostrarEscaner && <Escaner onScan={handleQRDetectado} />}

      <VentasForm 
        productoEscaneado={productoEscaneado} 
        onAgregar={handleAgregarVenta} 
      />
      <VentasTable ventas={ventas} />
    </div>
  );
};

export default Ventas;