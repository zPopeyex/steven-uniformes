// SupplierBadge.jsx - Supplier display badge with tooltip
import React, { useState } from 'react';
import { formatPhone, formatNIT } from '../../utils/format';

const SupplierBadge = ({ 
  supplier, 
  compact = false, 
  showTooltip = true 
}) => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  if (!supplier) {
    return (
      <span className="gastos-supplier-badge">
        <span className="gastos-supplier-name">—</span>
      </span>
    );
  }

  const supplierName = supplier.empresa || supplier.nombre || 'Sin nombre';
  const supplierNIT = supplier.nit || supplier.documento || '';
  const supplierPhone = supplier.telefono || supplier.celular || '';
  const supplierEmail = supplier.email || '';

  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  const hasAdditionalInfo = supplierNIT || supplierPhone || supplierEmail;

  if (compact) {
    return (
      <span className="gastos-supplier-badge gastos-supplier-badge--compact">
        <span className="gastos-supplier-name">{supplierName}</span>
      </span>
    );
  }

  return (
    <div className="gastos-supplier-badge" 
         onMouseEnter={handleMouseEnter} 
         onMouseLeave={handleMouseLeave}
         style={{ position: 'relative', display: 'inline-block' }}>
      
      <span className="gastos-supplier-icon" aria-hidden="true">🏢</span>
      <span className="gastos-supplier-name">{supplierName}</span>
      
      {showTooltip && hasAdditionalInfo && (
        <div 
          className={`gastos-supplier-tooltip ${showTooltipState ? 'show' : ''}`}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#1f2937',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: '1.4',
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
            marginTop: '8px',
            opacity: showTooltipState ? 1 : 0,
            visibility: showTooltipState ? 'visible' : 'hidden',
            transition: 'opacity 0.2s ease, visibility 0.2s ease',
            maxWidth: '250px',
            whiteSpace: 'normal'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>
            {supplierName}
          </div>
          
          {supplierNIT && (
            <div style={{ marginBottom: '4px' }}>
              <strong>NIT:</strong> {formatNIT(supplierNIT)}
            </div>
          )}
          
          {supplierPhone && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Teléfono:</strong> {formatPhone(supplierPhone)}
            </div>
          )}
          
          {supplierEmail && (
            <div>
              <strong>Email:</strong> {supplierEmail}
            </div>
          )}
          
          {/* Tooltip arrow */}
          <div 
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1f2937'
            }}
          />
        </div>
      )}
    </div>
  );
};

// Simple supplier name component without tooltip
export const SupplierName = ({ supplier, fallback = '—' }) => {
  if (!supplier) {
    return <span style={{ color: '#6b7280' }}>{fallback}</span>;
  }

  const name = supplier.empresa || supplier.nombre || fallback;
  
  return (
    <span style={{ fontWeight: '500', color: '#1f2937' }}>
      {name}
    </span>
  );
};

// Supplier selector option component
export const SupplierOption = ({ supplier, isSelected = false }) => {
  const supplierName = supplier.empresa || supplier.nombre || 'Sin nombre';
  const supplierNIT = supplier.nit || supplier.documento || '';

  return (
    <div 
      className={`gastos-supplier-option ${isSelected ? 'selected' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        fontSize: '14px'
      }}
    >
      <span className="gastos-supplier-name">{supplierName}</span>
      {supplierNIT && (
        <span 
          className="gastos-supplier-nit" 
          style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginLeft: '8px' 
          }}
        >
          {formatNIT(supplierNIT)}
        </span>
      )}
    </div>
  );
};

export default SupplierBadge;