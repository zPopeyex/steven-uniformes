import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartCard from "./ChartCard";

const VentasTimeChart = ({ dashboardData }) => {
  const [timeFilter, setTimeFilter] = useState("mes");
  const ventasPorMes = dashboardData.getVentasPorMes();

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

  const actions = (
    <select
      value={timeFilter}
      onChange={(e) => setTimeFilter(e.target.value)}
      className="form-select"
      style={{ width: "auto", minWidth: "120px" }}
    >
      <option value="mes">Por Mes</option>
      <option value="trimestre">Por Trimestre</option>
    </select>
  );

  return (
    <ChartCard title="Evolución de Ventas" actions={actions}>
      {ventasPorMes.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ventasPorMes} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="mes" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year.slice(2)}`;
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke="#0052CC" 
              strokeWidth={3}
              dot={{ fill: "#0052CC", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#0052CC", strokeWidth: 2, fill: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">
          <i className="fa-solid fa-chart-line chart-empty-icon"></i>
          <p>No hay datos de ventas por tiempo</p>
        </div>
      )}
    </ChartCard>
  );
};

export default VentasTimeChart;