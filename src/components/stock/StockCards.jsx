import React from "react";

const StockCards = ({ rows, TALLAS, getBadgeClass, getStockStatus }) => {
  const getTooltipText = (cantidad) => {
    if (cantidad < 0) return "Stock negativo. Revisa ventas/separados o agregados de inventario.";
    if (cantidad === 0) return "Sin stock disponible";
    if (cantidad <= 4) return `Stock bajo: ${cantidad} unidades`;
    if (cantidad <= 8) return `Stock medio: ${cantidad} unidades`;
    return `Stock alto: ${cantidad} unidades`;
  };

  return (
    <div className="stock-cards-grid">
      {rows.length > 0 ? (
        rows.map((row, index) => {
          const stockInfo = getStockStatus(row.total);
          
          return (
            <div key={row.label || index} className="stock-card">
              <div className="stock-card-header">
                <h4 className="product-title">{row.label}</h4>
                <span className={`stock-status-badge badge--${stockInfo.color}`}>
                  {stockInfo.icon} {stockInfo.status}
                </span>
              </div>
              
              <div className="stock-kpis">
                <div className="stock-kpi">
                  <span className="kpi-label">Total</span>
                  <span className={`kpi-value ${getBadgeClass(row.total)}`}>
                    {row.total}
                    {(row.total < 0 || row.tallasNegativas > 0) && 
                      <i className="fas fa-exclamation-triangle ml-1"></i>
                    }
                  </span>
                </div>
                <div className="stock-kpi">
                  <span className="kpi-label">Con Stock</span>
                  <span className="kpi-value">{row.tallasConStock}</span>
                </div>
                <div className="stock-kpi">
                  <span className="kpi-label">Sin Stock</span>
                  <span className="kpi-value">{row.tallasEnCero}</span>
                </div>
                {row.tallasNegativas > 0 && (
                  <div className="stock-kpi">
                    <span className="kpi-label">Negativas</span>
                    <span className="kpi-value kpi-danger">{row.tallasNegativas}</span>
                  </div>
                )}
              </div>

              <div className="sizes-distribution">
                <h5 className="sizes-title">Distribución por Tallas</h5>
                <div className="sizes-chips">
                  {TALLAS.map((talla) => {
                    const cantidad = row.tallas[talla] || 0;
                    if (cantidad === 0) return null;
                    
                    return (
                      <span
                        key={talla}
                        className={`size-chip ${getBadgeClass(cantidad)}`}
                        title={getTooltipText(cantidad)}
                      >
                        {talla}: {cantidad}
                        {cantidad < 0 && <i className="fas fa-exclamation-triangle ml-1"></i>}
                      </span>
                    );
                  })}
                </div>
                
                {TALLAS.every(talla => (row.tallas[talla] || 0) === 0) && (
                  <div className="sizes-empty">
                    <i className="fas fa-inbox"></i>
                    <span>Sin stock en ninguna talla</span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="cards-empty-state">
          <div className="empty-content">
            <i className="fas fa-box-open empty-icon"></i>
            <h4>No se encontraron productos</h4>
            <p>Intenta cambiar los filtros de búsqueda</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockCards;