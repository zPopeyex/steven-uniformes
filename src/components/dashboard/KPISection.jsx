import React from "react";
import KPIBox from "./KPIBox";

const KPISection = ({ dashboardData }) => {
  const { 
    data, 
    getVentasDelMes, 
    getEncargosStats, 
    getAbonosYSaldos 
  } = dashboardData;

  const ventasDelMes = getVentasDelMes();
  const totalVentasMes = ventasDelMes.reduce((sum, v) => sum + (v.precio || 0) * (v.cantidad || 0), 0);
  
  const encargosStats = getEncargosStats();
  const { totalAbonos, totalSaldos } = getAbonosYSaldos();
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="kpis-grid">
      <KPIBox
        icon="fa-solid fa-chart-line"
        title="Ventas del Mes"
        value={formatCurrency(totalVentasMes)}
        description={`${ventasDelMes.length} transacciones`}
        color="success"
      />
      <KPIBox
        icon="fa-solid fa-clipboard-list"
        title="Encargos"
        value={`${encargosStats.pendientes}/${encargosStats.total}`}
        description="Pendientes/Total"
        color="primary"
      />
      <KPIBox
        icon="fa-solid fa-wallet"
        title="Abonos y Saldos"
        value={formatCurrency(totalAbonos)}
        description={`Saldos: ${formatCurrency(totalSaldos)}`}
        color="warning"
      />
      <KPIBox
        icon="fa-solid fa-users"
        title="Clientes"
        value={data.clientes.length}
        description="Registrados"
        color="primary"
      />
      <KPIBox
        icon="fa-solid fa-tshirt"
        title="Productos"
        value={data.productos.length}
        description="En catálogo"
        color="primary"
      />
    </div>
  );
};

export default KPISection;