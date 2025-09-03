import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartCard from "./ChartCard";

const TallasChart = ({ dashboardData }) => {
  const tallas = dashboardData.getTallasMasVendidas();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Talla ${label}`}</p>
          <p className="tooltip-value">
            {`${payload[0].value} unidades vendidas`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard title="Tallas Más Vendidas">
      {tallas.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={tallas} 
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              dataKey="talla" 
              type="category" 
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" fill="#21ba45" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">
          <i className="fa-solid fa-ruler chart-empty-icon"></i>
          <p>No hay datos de tallas vendidas</p>
        </div>
      )}
    </ChartCard>
  );
};

export default TallasChart;