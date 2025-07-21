// 📄 src/pages/Stock.jsx

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import StockTable from "../components/StockTable";

const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "stock_actual"),
      orderBy("colegio"),
      orderBy("prenda"),
      orderBy("talla")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosData);
      setTimeout(() => setLoading(false), 100);
    });

    return () => unsubscribe(); // Limpia el listener al desmontar
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
