// ExpenseTypeBadge.jsx - Badge component for different expense types
import React from 'react';
import { getExpenseTypeBadgeClass } from '../../utils/format';

const ExpenseTypeBadge = ({ 
  type, 
  showIcon = true, 
  size = 'default' 
}) => {
  const getTypeIcon = (type) => {
    const icons = {
      'Tela': '🧵',
      'Mensajería': '📦',
      'Bordados': '🎨',
      'Almuerzos': '🍽️',
      'Otro': '📋'
    };
    return icons[type] || icons['Otro'];
  };

  const getTypeLabel = (type) => {
    // Ensure consistent labeling
    const labels = {
      'Tela': 'Tela',
      'Mensajería': 'Mensajería',
      'Bordados': 'Bordados',
      'Almuerzos': 'Almuerzos',
      'Otro': 'Otro'
    };
    return labels[type] || 'Otro';
  };

  const getSizeClass = (size) => {
    const sizeClasses = {
      'sm': 'gastos-badge--sm',
      'default': '',
      'lg': 'gastos-badge--lg'
    };
    return sizeClasses[size] || '';
  };

  if (!type) {
    return (
      <span className={`gastos-badge gastos-badge--otro ${getSizeClass(size)}`}>
        {showIcon && <span className="gastos-badge-icon" aria-hidden="true">❓</span>}
        <span className="gastos-badge-text">Sin tipo</span>
      </span>
    );
  }

  const badgeClass = getExpenseTypeBadgeClass(type);
  const sizeClass = getSizeClass(size);
  const icon = getTypeIcon(type);
  const label = getTypeLabel(type);

  return (
    <span className={`gastos-badge ${badgeClass} ${sizeClass}`}>
      {showIcon && (
        <span className="gastos-badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="gastos-badge-text">{label}</span>
    </span>
  );
};

// Pre-configured badge components for each type
export const TelaBadge = ({ showIcon = true, size = 'default' }) => (
  <ExpenseTypeBadge type="Tela" showIcon={showIcon} size={size} />
);

export const MensajeriaBadge = ({ showIcon = true, size = 'default' }) => (
  <ExpenseTypeBadge type="Mensajería" showIcon={showIcon} size={size} />
);

export const BordadosBadge = ({ showIcon = true, size = 'default' }) => (
  <ExpenseTypeBadge type="Bordados" showIcon={showIcon} size={size} />
);

export const AlmuerzosBadge = ({ showIcon = true, size = 'default' }) => (
  <ExpenseTypeBadge type="Almuerzos" showIcon={showIcon} size={size} />
);

export const OtroBadge = ({ showIcon = true, size = 'default' }) => (
  <ExpenseTypeBadge type="Otro" showIcon={showIcon} size={size} />
);

// Type selector component for forms
export const ExpenseTypeSelector = ({ 
  types, 
  selectedType, 
  onTypeChange, 
  disabled = false 
}) => {
  return (
    <div className="gastos-type-selector">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          className={`gastos-type-option ${selectedType === type ? 'selected' : ''}`}
          onClick={() => onTypeChange(type)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            border: selectedType === type ? '2px solid var(--gastos-primary)' : '1px solid var(--gastos-border)',
            borderRadius: 'var(--gastos-radius)',
            background: selectedType === type ? 'rgba(0,82,204,.05)' : '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <ExpenseTypeBadge type={type} size="sm" />
        </button>
      ))}
    </div>
  );
};

// Statistics component showing type distribution
export const ExpenseTypeStats = ({ expenses, total }) => {
  const typeStats = expenses.reduce((acc, expense) => {
    const type = expense.tipo || 'Otro';
    if (!acc[type]) {
      acc[type] = { count: 0, amount: 0 };
    }
    acc[type].count += 1;
    acc[type].amount += Number(expense.valor_total || 0);
    return acc;
  }, {});

  const sortedStats = Object.entries(typeStats)
    .sort(([,a], [,b]) => b.amount - a.amount);

  return (
    <div className="gastos-type-stats">
      <h3 className="gastos-stats-title">Distribución por Tipo</h3>
      <div className="gastos-stats-grid">
        {sortedStats.map(([type, stats]) => {
          const percentage = total > 0 ? ((stats.amount / total) * 100).toFixed(1) : '0';
          
          return (
            <div key={type} className="gastos-stats-item">
              <div className="gastos-stats-header">
                <ExpenseTypeBadge type={type} size="sm" />
                <span className="gastos-stats-count">({stats.count})</span>
              </div>
              <div className="gastos-stats-amount">
                {stats.amount.toLocaleString('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0
                })}
              </div>
              <div className="gastos-stats-percentage">
                {percentage}% del total
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseTypeBadge;