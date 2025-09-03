import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "./ChartCard";
import KPIBox from "./KPIBox";

const ExtrasSection = ({ dashboardData }) => {
  const ticketPromedio = dashboardData.getTicketPromedio();
  const clientesFrecuentes = dashboardData.getClientesFrecuentes();
  const distribucion = dashboardData.getDistribucionVentas();
  const encargosStats = dashboardData.getEncargosStats();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const distribucionData = [
    { name: "Ventas", value: distribucion.venta, color: "#21ba45" },
    { name: "Separados", value: distribucion.separado, color: "#f59e0b" },
    { name: "Encargos", value: distribucion.encargo, color: "#0052CC" }
  ].filter(item => item.value > 0);

  const entregadosPercent = encargosStats.total > 0 
    ? Math.round((encargosStats.entregados / encargosStats.total) * 100) 
    : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0].payload.name}</p>
          <p className="tooltip-value">
            {`Valor: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="kpis-grid">
        <KPIBox
          icon="fa-solid fa-calculator"
          title="Ticket Promedio"
          value={formatCurrency(ticketPromedio)}
          description="Por factura"
          color="primary"
        />
        <KPIBox
          icon="fa-solid fa-percentage"
          title="Encargos Entregados"
          value={`${entregadosPercent}%`}
          description={`${encargosStats.entregados}/${encargosStats.total}`}
          color={entregadosPercent >= 80 ? "success" : entregadosPercent >= 60 ? "warning" : "danger"}
        />
      </div>

      <div className="charts-grid">
        <ChartCard title="Clientes Más Frecuentes">
          {clientesFrecuentes.length > 0 ? (
            <ul className="ranking-list">
              {clientesFrecuentes.map((cliente, index) => (
                <li key={cliente.cliente} className="ranking-item">
                  <div className="ranking-position-wrapper">
                    <div className={`ranking-position ${
                      index === 0 ? 'gold' : 
                      index === 1 ? 'silver' : 
                      index === 2 ? 'bronze' : ''
                    }`}>
                      {index + 1}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-name">{cliente.cliente || "Cliente anónimo"}</div>
                      <div className="ranking-details">{cliente.compras} compras</div>
                    </div>
                  </div>
                  <div className="ranking-value">
                    <div className="ranking-amount">{formatCurrency(cliente.valor)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="chart-empty">
              <i className="fa-solid fa-user-friends chart-empty-icon"></i>
              <p>No hay datos de clientes frecuentes</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Distribución de Ventas">
          {distribucionData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={distribucionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribucionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              <div style={{ flex: 1 }}>
                <ul className="ranking-list">
                  {distribucionData.map((item, index) => (
                    <li key={item.name} className="ranking-item">
                      <div className="ranking-position-wrapper">
                        <div 
                          className="ranking-position"
                          style={{ 
                            backgroundColor: item.color,
                            width: '24px',
                            height: '24px',
                            fontSize: '12px'
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="ranking-info">
                          <div className="ranking-name">{item.name}</div>
                        </div>
                      </div>
                      <div className="ranking-value">
                        <div className="ranking-amount">{formatCurrency(item.value)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <i className="fa-solid fa-chart-pie chart-empty-icon"></i>
              <p>No hay datos de distribución</p>
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
};

export default ExtrasSection;