import React from "react";

const KPIBox = ({ icon, title, value, description, color = "primary" }) => {
  const colorClasses = {
    primary: "kpi-primary",
    success: "kpi-success",
    warning: "kpi-warning",
    danger: "kpi-danger"
  };

  return (
    <div className={`kpi-box ${colorClasses[color]}`}>
      <div className="kpi-icon">
        <i className={icon}></i>
      </div>
      <div className="kpi-content">
        <h3 className="kpi-value">{value}</h3>
        <p className="kpi-title">{title}</p>
        {description && <p className="kpi-description">{description}</p>}
      </div>
    </div>
  );
};

export default KPIBox;