// 📄 src/pages/Stock.jsx

import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaBoxes, FaFilter } from "react-icons/fa";

const removeDiacritics = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");

const norm = (s) => removeDiacritics(String(s || "").trim().toLowerCase());

const normalizeTalla = (v) => {
  const t = String(v ?? "").trim().toUpperCase();
  const mapTxt = { S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" };
  if (mapTxt[t]) return mapTxt[t];
  const num = t.replace(/[^\d]/g, "");
  return num ? String(Number(num)) : null;
};

const TALLAS = ["6", "8", "10", "12", "14", "16", "S", "M", "L", "XL", "XXL"];

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

  const { byPlantel, labelPlantel } = useMemo(() => {
    const byPlantel = new Map();
    const labelPlantel = new Map();
    for (const item of productos) {
      const plantelKey = norm(item.colegio);
      const productoKey = norm(item.prenda);
      const tallaKey = normalizeTalla(item.talla);
      const qty = Number(item.cantidad) || 0;
      if (!plantelKey || !productoKey || !tallaKey) continue;
      if (!TALLAS.includes(tallaKey)) continue;
      if (!byPlantel.has(plantelKey)) byPlantel.set(plantelKey, new Map());
      if (!labelPlantel.has(plantelKey))
        labelPlantel.set(plantelKey, String(item.colegio).trim());
      const byProducto = byPlantel.get(plantelKey);
      if (!byProducto.has(productoKey)) {
        byProducto.set(productoKey, {
          label: String(item.prenda).trim(),
          tallas: Object.fromEntries(TALLAS.map((t) => [t, 0])),
        });
      }
      byProducto.get(productoKey).tallas[tallaKey] += qty;
    }
    return { byPlantel, labelPlantel };
  }, [productos]);

  const planteles = useMemo(
    () =>
      Array.from(labelPlantel.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([key, label]) => ({ key, label })),
    [labelPlantel]
  );

  useEffect(() => {
    if (planteles.length && !activeTab) setActiveTab(planteles[0].key);
  }, [planteles, activeTab]);

  const rows = useMemo(() => {
    const byProducto = byPlantel.get(activeTab);
    if (!byProducto) return [];
    return Array.from(byProducto.values())
      .map((row) => {
        const total = TALLAS.reduce(
          (sum, t) => sum + (row.tallas[t] || 0),
          0
        );
        return { producto: row.label, ...row.tallas, total };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => a.producto.localeCompare(b.producto));
  }, [byPlantel, activeTab]);

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
                key={pl.key}
                role="tab"
                aria-selected={activeTab === pl.key}
                className={`tab-btn ${activeTab === pl.key ? "active" : ""}`}
                onClick={() => setActiveTab(pl.key)}
              >
                {pl.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="tab-content">
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
                  {rows
                    .filter((r) =>
                      r.producto.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((row) => (
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
        </div>
      )}
    </div>
  );
};

export default Stock;
