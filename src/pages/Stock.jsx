// 📄 src/pages/Stock.jsx

import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaBoxes, FaFilter } from "react-icons/fa";

const TALLAS = [6, 8, 10, 12, 14, 16, "S", "M", "L", "XL", "XXL"];

const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

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

  const planteles = useMemo(() => {
    const uniques = Array.from(new Set(productos.map((p) => p.colegio)));
    return uniques.sort();
  }, [productos]);

  useEffect(() => {
    if (planteles.length && !activeTab) setActiveTab(planteles[0]);
  }, [planteles, activeTab]);

  const pivot = useMemo(() => {
    const grouped = {};
    productos.forEach(({ colegio, prenda, talla, cantidad }) => {
      if (!grouped[colegio]) grouped[colegio] = {};
      if (!grouped[colegio][prenda]) grouped[colegio][prenda] = {};
      grouped[colegio][prenda][talla] =
        (grouped[colegio][prenda][talla] || 0) + Number(cantidad || 0);
    });
    const result = {};
    Object.keys(grouped).forEach((colegio) => {
      result[colegio] = Object.keys(grouped[colegio])
        .map((producto) => {
          const row = { producto };
          let total = 0;
          TALLAS.forEach((t) => {
            const qty = grouped[colegio][producto][t] || 0;
            row[t] = qty;
            total += qty;
          });
          row.total = total;
          return row;
        })
        .filter((r) => r.total > 0);
    });
    return result;
  }, [productos]);

  const getBadgeClass = (n) => {
    if (n === 0) return "badge--zero";
    if (n <= 4) return "badge--low";
    if (n <= 8) return "badge--medium";
    return "badge--high";
  };

  const handleFilterClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div style={{ padding: 20 }}>
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
        <div className="stock-card">
          <div className="card-header">
            <FaBoxes color="var(--blue)" />
            <h2>Inventario Actual (Stock)</h2>
          </div>
          <div className="card-controls">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar plantel o producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={handleFilterClick}>
              <FaFilter /> Filtrar
            </button>
          </div>
          <div className="tab-controls" role="tablist">
            {planteles.map((pl) => (
              <button
                key={pl}
                role="tab"
                aria-selected={activeTab === pl}
                className={`tab-btn ${activeTab === pl ? "active" : ""}`}
                onClick={() => setActiveTab(pl)}
              >
                {pl}
              </button>
            ))}
          </div>
          {planteles.map((pl) => {
            const rows = (pivot[pl] || []).filter((r) =>
              r.producto.toLowerCase().includes(search.toLowerCase())
            );
            return (
              <div
                key={pl}
                role="tabpanel"
                hidden={activeTab !== pl}
                className="tab-content"
              >
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        {TALLAS.map((t) => (
                          <th key={t}>{t}</th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.producto}>
                          <td>{row.producto}</td>
                          {TALLAS.map((t) => (
                            <td key={`${row.producto}-${t}`}>
                              <span className={`badge ${getBadgeClass(row[t])}`}>
                                {row[t]}
                              </span>
                            </td>
                          ))}
                          <td>
                            <span className={`badge ${getBadgeClass(row.total)}`}>
                              {row.total}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Stock;
