import React from "react";
import ChartCard from "./ChartCard";

const ProductosChart = ({ dashboardData }) => {
  const productos = dashboardData.getProductosMasVendidos();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <ChartCard title="Productos Más Vendidos">
      {productos.length > 0 ? (
        <ul className="ranking-list">
          {productos.map((producto, index) => (
            <li key={producto.prenda} className="ranking-item">
              <div className="ranking-position-wrapper">
                <div className={`ranking-position ${
                  index === 0 ? 'gold' : 
                  index === 1 ? 'silver' : 
                  index === 2 ? 'bronze' : ''
                }`}>
                  {index + 1}
                </div>
                <div className="ranking-info">
                  <div className="ranking-name">{producto.prenda}</div>
                  <div className="ranking-details">{producto.cantidad} unidades vendidas</div>
                </div>
              </div>
              <div className="ranking-value">
                <div className="ranking-amount">{formatCurrency(producto.valor)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="chart-empty">
          <i className="fa-solid fa-tshirt chart-empty-icon"></i>
          <p>No hay datos de productos vendidos</p>
        </div>
      )}
    </ChartCard>
  );
};

export default ProductosChart;