import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartCard from "./ChartCard";

const ColegiosChart = ({ dashboardData }) => {
  const colegios = dashboardData.getColegiosMasVendidos();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p className="tooltip-value">
            {`Valor: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="tooltip-count">
            {`Cantidad: ${payload[0].payload.cantidad} unidades`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title="Colegios Más Vendidos">
      {colegios.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={colegios} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="colegio" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valor" fill="#0052CC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">
          <i className="fa-solid fa-chart-bar chart-empty-icon"></i>
          <p>No hay datos de ventas por colegios</p>
        </div>
      )}
    </ChartCard>
  );
};

export default ColegiosChart;