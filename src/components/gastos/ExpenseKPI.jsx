// ExpenseKPI.jsx - KPI metrics card component for expenses
import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/format';

const ExpenseKPI = ({ 
  label, 
  value, 
  type = 'default', 
  prefix = '', 
  suffix = '',
  loading = false 
}) => {
  const getValueClass = () => {
    switch (type) {
      case 'currency':
        return 'gastos-kpi-value gastos-kpi-value--primary';
      case 'count':
        return 'gastos-kpi-value';
      case 'average':
        return 'gastos-kpi-value gastos-kpi-value--green';
      default:
        return 'gastos-kpi-value';
    }
  };

  const formatValue = () => {
    if (loading) {
      return <div className="gastos-skeleton gastos-skeleton--title" style={{ width: '80%', height: '24px' }} />;
    }

    let formattedValue;
    
    switch (type) {
      case 'currency':
        formattedValue = formatCurrency(value);
        break;
      case 'count':
        formattedValue = formatNumber(value);
        break;
      case 'average':
        formattedValue = formatCurrency(value);
        break;
      default:
        formattedValue = String(value || 0);
    }

    return prefix + formattedValue + suffix;
  };

  if (loading) {
    return (
      <div className="gastos-kpi-card">
        <div className="gastos-kpi-label">
          <div className="gastos-skeleton gastos-skeleton--text" style={{ width: '60%' }} />
        </div>
        <div className="gastos-kpi-value">
          <div className="gastos-skeleton gastos-skeleton--title" style={{ width: '80%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="gastos-kpi-card">
      <div className="gastos-kpi-label">{label}</div>
      <div className={getValueClass()}>
        {formatValue()}
      </div>
    </div>
  );
};

// Compound component for KPI row container
export const ExpenseKPIRow = ({ children, loading = false }) => {
  if (loading) {
    return (
      <div className="gastos-kpi-row">
        {Array.from({ length: 3 }, (_, i) => (
          <ExpenseKPI key={i} loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="gastos-kpi-row">
      {children}
    </div>
  );
};

// Pre-configured KPI components for common expense metrics
export const TotalExpenseKPI = ({ value, loading = false }) => (
  <ExpenseKPI
    label="Total Gastos"
    value={value}
    type="currency"
    loading={loading}
  />
);

export const ExpenseCountKPI = ({ value, loading = false }) => (
  <ExpenseKPI
    label="Registros"
    value={value}
    type="count"
    loading={loading}
  />
);

export const AverageExpenseKPI = ({ value, loading = false }) => (
  <ExpenseKPI
    label="Promedio"
    value={value}
    type="average"
    loading={loading}
  />
);

export default ExpenseKPI;