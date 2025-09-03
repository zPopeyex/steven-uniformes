import React from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import KPISection from "../components/dashboard/KPISection";
import ColegiosChart from "../components/dashboard/ColegiosChart";
import ProductosChart from "../components/dashboard/ProductosChart";
import TallasChart from "../components/dashboard/TallasChart";
import VentasTimeChart from "../components/dashboard/VentasTimeChart";
import MetodosPagoChart from "../components/dashboard/MetodosPagoChart";
import ExtrasSection from "../components/dashboard/ExtrasSection";
import Spinner from "../components/Spinner";
import "../styles/dashboard.css";

const Inicio = () => {
  const dashboardData = useDashboardData();

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Panel de control y métricas empresariales</p>
      </div>

      <KPISection dashboardData={dashboardData} />

      <div className="charts-grid">
        <ColegiosChart dashboardData={dashboardData} />
        <ProductosChart dashboardData={dashboardData} />
      </div>

      <div className="charts-grid">
        <TallasChart dashboardData={dashboardData} />
        <MetodosPagoChart dashboardData={dashboardData} />
      </div>

      <div className="charts-grid full-width">
        <VentasTimeChart dashboardData={dashboardData} />
      </div>

      <ExtrasSection dashboardData={dashboardData} />
    </div>
  );
};

export default Inicio;
