import React from "react";

const ChartCard = ({ title, children, className = "", actions }) => {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {actions && <div className="chart-actions">{actions}</div>}
      </div>
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;