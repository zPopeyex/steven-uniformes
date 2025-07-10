// 📄 src/pages/Stock.jsx

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import StockTable from '../components/StockTable';

const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const q = query(
    collection(db, "inventario_stock"),
    orderBy("colegio"),
    orderBy("prenda"),
    orderBy("talla")
  );

  const cargarStock = async () => {
    setLoading(true); // forzar carga
    try {
      const q = query(
        collection(db, "inventario_stock"),
        orderBy("colegio"),
        orderBy("prenda"),
        orderBy("talla")
      );
      const snapshot = await getDocs(q);
      const productosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosData);
    } catch (error) {
      console.error("Error cargando inventario_stock:", error);
    } finally {
      // Espera 100ms antes de mostrar la tabla
      setTimeout(() => setLoading(false), 100);
    }
  };

  useEffect(() => {
    cargarStock();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Inventario Actual (Stock)</h2>

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
    ⏳ Cargando stock...
  </div>
) : (
  <StockTable stock={productos} />
)}

    </div>
  );
};

export default Stock;
