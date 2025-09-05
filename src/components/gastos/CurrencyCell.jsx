// CurrencyCell.jsx - Currency display component with Colombian formatting
import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/format';

const CurrencyCell = ({ 
  value, 
  showDecimals = false, 
  size = 'default',
  color = 'primary',
  align = 'right',
  loading = false
}) => {
  const getSizeClass = () => {
    const sizeClasses = {
      'sm': { fontSize: '12px', fontWeight: '500' },
      'default': { fontSize: '14px', fontWeight: '700' },
      'lg': { fontSize: '16px', fontWeight: '700' },
      'xl': { fontSize: '18px', fontWeight: '700' }
    };
    return sizeClasses[size] || sizeClasses.default;
  };

  const getColorStyle = () => {
    const colorStyles = {
      'primary': { color: 'var(--gastos-primary)' },
      'green': { color: 'var(--gastos-green)' },
      'text': { color: 'var(--gastos-text)' },
      'muted': { color: 'var(--gastos-text-muted)' },
      'success': { color: '#10b981' },
      'danger': { color: '#dc2626' },
      'warning': { color: '#f59e0b' }
    };
    return colorStyles[color] || colorStyles.primary;
  };

  const getAlignStyle = () => {
    return { textAlign: align };
  };

  if (loading) {
    return (
      <div 
        className="gastos-table-amount" 
        style={{ ...getAlignStyle(), ...getSizeClass() }}
      >
        <div 
          className="gastos-skeleton gastos-skeleton--text" 
          style={{ width: '80px', height: '16px', marginLeft: align === 'right' ? 'auto' : '0' }}
        />
      </div>
    );
  }

  const formattedValue = formatCurrency(value, showDecimals);
  
  return (
    <div 
      className="gastos-currency-cell"
      style={{
        ...getAlignStyle(),
        ...getSizeClass(),
        ...getColorStyle(),
        whiteSpace: 'nowrap'
      }}
    >
      {formattedValue}
    </div>
  );
};

// Compact currency display without full formatting (for small spaces)
export const CompactCurrency = ({ value, prefix = '$' }) => {
  const numValue = Number(value || 0);
  
  if (numValue >= 1000000) {
    return (
      <span className="gastos-currency-compact">
        {prefix}{(numValue / 1000000).toFixed(1)}M
      </span>
    );
  } else if (numValue >= 1000) {
    return (
      <span className="gastos-currency-compact">
        {prefix}{(numValue / 1000).toFixed(0)}K
      </span>
    );
  }
  
  return (
    <span className="gastos-currency-compact">
      {prefix}{formatNumber(numValue)}
    </span>
  );
};

// Currency input component with real-time formatting
export const CurrencyInput = ({ 
  value, 
  onChange, 
  placeholder = 'Ingrese valor...',
  disabled = false,
  className = '',
  ...props 
}) => {
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Remove all non-numeric characters except decimals
    const numericValue = inputValue.replace(/[^\d.]/g, '');
    
    // Parse to number and call onChange
    const parsed = parseFloat(numericValue) || 0;
    onChange(parsed);
    
    // Update display value
    if (numericValue) {
      setDisplayValue(formatNumber(parsed));
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplayValue(formatNumber(value));
    }
  };

  const handleFocus = (e) => {
    // Show raw number for editing
    if (value) {
      setDisplayValue(String(value));
      e.target.select();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={`gastos-input gastos-currency-input ${className}`}
      style={{ textAlign: 'right' }}
      {...props}
    />
  );
};

// Difference component showing positive/negative changes
export const CurrencyDifference = ({ 
  current, 
  previous, 
  showPercentage = true 
}) => {
  const difference = Number(current || 0) - Number(previous || 0);
  const percentage = previous > 0 ? ((difference / previous) * 100) : 0;
  
  const isPositive = difference > 0;
  const isNegative = difference < 0;
  
  const getColor = () => {
    if (isPositive) return 'var(--gastos-green)';
    if (isNegative) return '#dc2626';
    return 'var(--gastos-text-muted)';
  };

  const getIcon = () => {
    if (isPositive) return '↗';
    if (isNegative) return '↘';
    return '→';
  };

  return (
    <div 
      className="gastos-currency-difference"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: getColor(),
        fontWeight: '500'
      }}
    >
      <span aria-hidden="true">{getIcon()}</span>
      <span>{formatCurrency(Math.abs(difference))}</span>
      {showPercentage && percentage !== 0 && (
        <span>({Math.abs(percentage).toFixed(1)}%)</span>
      )}
    </div>
  );
};

// Total summary component
export const CurrencyTotal = ({ 
  values = [], 
  label = 'Total',
  size = 'lg',
  highlight = true 
}) => {
  const total = values.reduce((sum, val) => sum + Number(val || 0), 0);
  
  return (
    <div 
      className={`gastos-currency-total ${highlight ? 'highlighted' : ''}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: highlight ? '12px 16px' : '8px 0',
        borderTop: highlight ? '2px solid var(--gastos-border)' : 'none',
        backgroundColor: highlight ? 'var(--gastos-bg-light)' : 'transparent',
        borderRadius: highlight ? 'var(--gastos-radius)' : '0'
      }}
    >
      <span 
        style={{
          fontSize: size === 'lg' ? '16px' : '14px',
          fontWeight: '600',
          color: 'var(--gastos-text)'
        }}
      >
        {label}:
      </span>
      <CurrencyCell 
        value={total}
        size={size}
        color={highlight ? 'primary' : 'text'}
      />
    </div>
  );
};

export default CurrencyCell;