import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "./ChartCard";

const MetodosPagoChart = ({ dashboardData }) => {
  const metodos = dashboardData.getMetodosPago();

  const COLORS = ['#0052CC', '#21ba45', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0].payload.metodo}</p>
          <p className="tooltip-value">
            {`Valor: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="tooltip-count">
            {`Transacciones: ${payload[0].payload.cantidad}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }) => {
    if (percent < 0.05) return null; // No mostrar labels para porcentajes muy pequeños
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartCard title="Métodos de Pago">
      {metodos.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <ResponsiveContainer width="60%" height={250}>
            <PieChart>
              <Pie
                data={metodos}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
              >
                {metodos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div style={{ flex: 1 }}>
            <ul className="ranking-list">
              {metodos.map((metodo, index) => (
                <li key={metodo.metodo} className="ranking-item">
                  <div className="ranking-position-wrapper">
                    <div 
                      className="ranking-position"
                      style={{ 
                        backgroundColor: COLORS[index % COLORS.length],
                        width: '24px',
                        height: '24px',
                        fontSize: '12px'
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-name">{metodo.metodo}</div>
                      <div className="ranking-details">{metodo.cantidad} transacciones</div>
                    </div>
                  </div>
                  <div className="ranking-value">
                    <div className="ranking-amount">{formatCurrency(metodo.valor)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="chart-empty">
          <i className="fa-solid fa-credit-card chart-empty-icon"></i>
          <p>No hay datos de métodos de pago</p>
        </div>
      )}
    </ChartCard>
  );
};

export default MetodosPagoChart;