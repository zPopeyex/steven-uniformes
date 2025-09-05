// EmptyState.jsx - Empty state component for expenses table
import React from 'react';

const EmptyState = ({ 
  title = "No hay gastos registrados",
  description = "No se encontraron gastos en el rango de fechas seleccionado.",
  icon = "📊",
  showAction = true,
  actionText = "Limpiar filtros",
  onAction = null,
  type = "default"
}) => {
  const getEmptyStateConfig = () => {
    const configs = {
      'no-data': {
        icon: "📊",
        title: "Sin datos disponibles",
        description: "Aún no hay gastos registrados en el sistema.",
        actionText: "Agregar primer gasto",
        showAction: false
      },
      'no-results': {
        icon: "🔍",
        title: "Sin resultados",
        description: "No se encontraron gastos que coincidan con los filtros aplicados.",
        actionText: "Limpiar filtros",
        showAction: true
      },
      'loading-error': {
        icon: "⚠️",
        title: "Error al cargar",
        description: "Hubo un problema al cargar los gastos. Inténtalo de nuevo.",
        actionText: "Reintentar",
        showAction: true
      },
      'pending-empty': {
        icon: "📝",
        title: "Lista vacía",
        description: "No hay gastos pendientes para guardar.",
        actionText: "Agregar gasto",
        showAction: false
      },
      'default': {
        icon: icon,
        title: title,
        description: description,
        actionText: actionText,
        showAction: showAction
      }
    };

    return configs[type] || configs['default'];
  };

  const config = getEmptyStateConfig();

  return (
    <div className="gastos-empty-state">
      <div className="gastos-empty-icon">
        {config.icon}
      </div>
      
      <h3 className="gastos-empty-title">
        {config.title}
      </h3>
      
      <p className="gastos-empty-description">
        {config.description}
      </p>
      
      {config.showAction && onAction && (
        <button
          onClick={onAction}
          className="gastos-btn gastos-btn--primary"
          type="button"
        >
          {config.actionText}
        </button>
      )}
    </div>
  );
};

// Specific empty state components for different scenarios
export const NoExpensesFound = ({ onClearFilters }) => (
  <EmptyState
    type="no-results"
    onAction={onClearFilters}
  />
);

export const NoExpensesYet = () => (
  <EmptyState
    type="no-data"
  />
);

export const ExpensesLoadingError = ({ onRetry }) => (
  <EmptyState
    type="loading-error"
    onAction={onRetry}
  />
);

export const NoPendingExpenses = () => (
  <EmptyState
    type="pending-empty"
  />
);

// Loading skeleton for empty state
export const EmptyStateLoading = () => (
  <div className="gastos-empty-state">
    <div className="gastos-empty-icon">
      <div 
        className="gastos-skeleton" 
        style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%',
          margin: '0 auto 16px'
        }} 
      />
    </div>
    
    <div className="gastos-empty-title">
      <div 
        className="gastos-skeleton gastos-skeleton--title" 
        style={{ width: '200px', margin: '0 auto 8px' }} 
      />
    </div>
    
    <div className="gastos-empty-description">
      <div 
        className="gastos-skeleton gastos-skeleton--text" 
        style={{ width: '300px', margin: '0 auto 4px' }} 
      />
      <div 
        className="gastos-skeleton gastos-skeleton--text" 
        style={{ width: '250px', margin: '0 auto' }} 
      />
    </div>
  </div>
);

// Empty state with custom illustration
export const CustomEmptyState = ({ 
  children, 
  title, 
  description, 
  actions 
}) => (
  <div className="gastos-empty-state">
    <div className="gastos-empty-icon">
      {children}
    </div>
    
    {title && (
      <h3 className="gastos-empty-title">
        {title}
      </h3>
    )}
    
    {description && (
      <p className="gastos-empty-description">
        {description}
      </p>
    )}
    
    {actions && (
      <div className="gastos-empty-actions" style={{ marginTop: '16px' }}>
        {actions}
      </div>
    )}
  </div>
);

// Table empty state specifically designed for table context
export const TableEmptyState = ({ 
  colSpan = 5,
  type = "no-results",
  onAction = null
}) => {
  const config = {
    'no-results': {
      icon: "🔍",
      title: "Sin resultados",
      description: "No se encontraron gastos con los filtros aplicados.",
      actionText: "Limpiar filtros"
    },
    'no-data': {
      icon: "📊", 
      title: "Sin gastos",
      description: "Aún no hay gastos registrados.",
      actionText: null
    }
  }[type];

  return (
    <tr>
      <td 
        colSpan={colSpan} 
        style={{ 
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--gastos-text-muted)'
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>
          {config.icon}
        </div>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '8px',
          color: 'var(--gastos-text)' 
        }}>
          {config.title}
        </div>
        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
          {config.description}
        </div>
        {config.actionText && onAction && (
          <button
            onClick={onAction}
            className="gastos-btn gastos-btn--primary"
            type="button"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {config.actionText}
          </button>
        )}
      </td>
    </tr>
  );
};

export default EmptyState;