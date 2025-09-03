import React from "react";

const StockTable = ({ rows, TALLAS, getBadgeClass }) => {
  const getTooltipText = (cantidad) => {
    if (cantidad < 0) return "Stock negativo. Revisa ventas/separados o agregados de inventario.";
    if (cantidad === 0) return "Sin stock disponible";
    if (cantidad <= 4) return `Stock bajo: ${cantidad} unidades`;
    if (cantidad <= 8) return `Stock medio: ${cantidad} unidades`;
    return `Stock alto: ${cantidad} unidades`;
  };

  return (
    <div className="stock-table-wrapper">
      <div className="table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th className="product-column">Producto</th>
              {TALLAS.map((talla) => (
                <th key={talla} className="size-column">{talla}</th>
              ))}
              <th className="total-column">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={row.label || index} className="stock-row">
                  <td className="product-cell">
                    <div className="product-info">
                      <span className="product-name">{row.label}</span>
                    </div>
                  </td>
                  {TALLAS.map((talla) => {
                    const cantidad = row.tallas[talla] || 0;
                    return (
                      <td key={`${row.label}-${talla}`} className="size-cell">
                        <span 
                          className={getBadgeClass(cantidad)}
                          title={getTooltipText(cantidad)}
                        >
                          {cantidad}
                          {cantidad < 0 && <i className="fas fa-exclamation-triangle ml-1"></i>}
                        </span>
                      </td>
                    );
                  })}
                  <td className="total-cell">
                    <span 
                      className={`${getBadgeClass(row.total)} total-badge`}
                      title={getTooltipText(row.total)}
                    >
                      {row.total}
                      {(row.total < 0 || row.tallasNegativas > 0) && 
                        <i className="fas fa-exclamation-triangle ml-1"></i>
                      }
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={TALLAS.length + 2} className="empty-state">
                  <div className="empty-content">
                    <i className="fas fa-box-open empty-icon"></i>
                    <p>No se encontraron productos</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockTable;