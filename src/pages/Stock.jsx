import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { FaBoxes, FaFilter, FaTable, FaTh } from "react-icons/fa";
import { useStockPivot } from "../hooks/useStockPivot";
import StockTable from "../components/stock/StockTable";
import StockCards from "../components/stock/StockCards";
import "../styles/stock.css";


const Stock = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('stock-view-mode') || 'table';
  });
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);

  // Suscripción al stock en tiempo real
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

    return () => unsubscribe();
  }, []);

  // Hook para procesamiento de datos
  const { planteles, getRowsForPlantel, getBadgeClass, getStockStatus, TALLAS } = useStockPivot(productos);

  // Tab por defecto
  useEffect(() => {
    if (planteles.length && !activeTab) setActiveTab(planteles[0].key);
  }, [planteles, activeTab]);

  // Guardar preferencia de vista
  useEffect(() => {
    localStorage.setItem('stock-view-mode', viewMode);
  }, [viewMode]);

  // Filas filtradas del tab activo
  const rows = getRowsForPlantel(activeTab, search, stockFilter);

  const handleFilterClick = () => {
    setShowFilters(!showFilters);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const exportToCSV = () => {
    const activePlantel = planteles.find(p => p.key === activeTab);
    if (!activePlantel) return;

    const csvRows = [
      ['Producto', ...TALLAS, 'Total'].join(','),
      ...rows.map(row => [
        `"${row.label}"`,
        ...TALLAS.map(t => row.tallas[t] || 0),
        row.total
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-${activePlantel.label}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="stock-container">
        <div className="stock-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span className="loading-text">Cargando inventario...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-container">
      {/* Header con controles */}
      <div className="stock-header">
        <h1 className="stock-title">
          <FaBoxes />
          Inventario Actual (Stock)
        </h1>
        
        <div className="stock-controls">
          <div className="stock-search">
            <i className="fas fa-search stock-search-icon"></i>
            <input
              ref={inputRef}
              type="text"
              className="stock-search-input"
              placeholder="Buscar plantel o producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filters-dropdown">
            <button 
              className="stock-filter-btn"
              onClick={handleFilterClick}
            >
              <FaFilter />
              Filtros
            </button>
            
            {showFilters && (
              <div className="filters-menu">
                <div className="filter-group">
                  <label className="filter-label">Estado de Stock</label>
                  <select
                    className="filter-select"
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                  >
                    <option value="todos">Todos los productos</option>
                    <option value="con-stock">Con stock</option>
                    <option value="bajo-stock">Stock bajo (≤4)</option>
                    <option value="sin-stock">Sin stock</option>
                    <option value="negativo">Stock negativo</option>
                  </select>
                </div>
                
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={exportToCSV}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <i className="fas fa-download"></i>
                  Exportar CSV
                </button>
              </div>
            )}
          </div>
          
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('table')}
            >
              <FaTable />
              Tabla
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('cards')}
            >
              <FaTh />
              Tarjetas
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de planteles */}
      <div className="stock-tabs" role="tablist">
        {planteles.map((plantel) => {
          const plantelRows = getRowsForPlantel(plantel.key, "", "todos");
          return (
            <button
              key={plantel.key}
              role="tab"
              aria-selected={activeTab === plantel.key}
              className={`stock-tab ${activeTab === plantel.key ? "active" : ""}`}
              onClick={() => setActiveTab(plantel.key)}
            >
              {plantel.label}
              <span className="tab-count">{plantelRows.length}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido del tab activo */}
      <div role="tabpanel">
        {viewMode === 'table' ? (
          <StockTable 
            rows={rows}
            TALLAS={TALLAS}
            getBadgeClass={getBadgeClass}
          />
        ) : (
          <StockCards 
            rows={rows}
            TALLAS={TALLAS}
            getBadgeClass={getBadgeClass}
            getStockStatus={getStockStatus}
          />
        )}
      </div>
    </div>
  );
};

export default Stock;
