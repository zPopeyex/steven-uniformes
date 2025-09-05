// Format utility functions for Gastos page
// Maintains consistency with existing es-CO locale formatting

/**
 * Formats currency value as Colombian Peso (COP)
 * @param {number} value - Numeric value to format
 * @param {boolean} showDecimals - Whether to show decimal places
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, showDecimals = false) => {
  const numValue = Number(value || 0);
  
  if (showDecimals) {
    return numValue.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return numValue.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * Formats number with thousands separators (es-CO locale)
 * @param {number} value - Numeric value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  const numValue = Number(value || 0);
  
  return numValue.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formats date and time in Colombian format
 * @param {Date|Timestamp} dateValue - Date value to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDateTime = (dateValue, includeTime = true) => {
  let date;
  
  // Handle Firestore Timestamp
  if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else if (dateValue?.seconds) {
    date = new Date(dateValue.seconds * 1000);
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    date = dateValue || new Date();
  }
  
  if (includeTime) {
    return date.toLocaleDateString('es-CO') + ' ' + 
           date.toLocaleTimeString('es-CO', {
             hour: '2-digit',
             minute: '2-digit',
             hour12: true
           });
  }
  
  return date.toLocaleDateString('es-CO');
};

/**
 * Formats date only in Colombian format
 * @param {Date|string} dateValue - Date value to format
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
export const formatDate = (dateValue) => {
  return formatDateTime(dateValue, false);
};

/**
 * Formats time only in Colombian format
 * @param {Date|Timestamp} dateValue - Date value to format
 * @returns {string} Formatted time string (HH:MM AM/PM)
 */
export const formatTime = (dateValue) => {
  let date;
  
  if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else if (dateValue?.seconds) {
    date = new Date(dateValue.seconds * 1000);
  } else {
    date = dateValue || new Date();
  }
  
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Calculates and formats percentage
 * @param {number} value - Value for percentage calculation
 * @param {number} total - Total value for percentage calculation
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (!total || total === 0) return '0%';
  
  const percentage = (Number(value || 0) / Number(total)) * 100;
  return percentage.toFixed(decimals) + '%';
};

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Formats large numbers with K, M suffixes
 * @param {number} value - Number to format
 * @returns {string} Formatted number with suffix
 */
export const formatLargeNumber = (value) => {
  const numValue = Number(value || 0);
  
  if (numValue >= 1000000) {
    return (numValue / 1000000).toFixed(1) + 'M';
  } else if (numValue >= 1000) {
    return (numValue / 1000).toFixed(1) + 'K';
  }
  
  return formatNumber(numValue);
};

/**
 * Formats phone number (Colombian format)
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // Mobile: 300 123 4567
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  } else if (cleaned.length === 7) {
    // Landline: 123 4567
    return cleaned.replace(/(\d{3})(\d{4})/, '$1 $2');
  }
  
  return phone;
};

/**
 * Capitalizes first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Validates and formats Colombian NIT
 * @param {string} nit - NIT to format
 * @returns {string} Formatted NIT
 */
export const formatNIT = (nit) => {
  if (!nit) return '';
  
  const cleaned = nit.replace(/\D/g, '');
  
  if (cleaned.length >= 8) {
    // Format as: 12.345.678-9
    return cleaned.replace(/(\d{1,3})(?=(\d{3})+(?!\d))/g, '$1.') + 
           (cleaned.length > 9 ? '-' + cleaned.slice(-1) : '');
  }
  
  return nit;
};

/**
 * Formats fabric code display
 * @param {string} code - Fabric code
 * @param {string} description - Fabric description
 * @returns {string} Formatted fabric display
 */
export const formatFabricDisplay = (code, description) => {
  if (!code && !description) return '—';
  
  if (description) {
    return code ? `${code} — ${description}` : description;
  }
  
  return code || '—';
};

/**
 * Formats expense detail based on type
 * @param {Object} expense - Expense object
 * @param {Object} proveedores - Suppliers lookup
 * @returns {string} Formatted detail string
 */
export const formatExpenseDetail = (expense, proveedores = []) => {
  const tipo = expense.tipo;
  const detalle = expense.detalle || {};
  
  if (tipo === 'Tela') {
    const metros = detalle.metros || 0;
    const valorUnitario = expense.valor_unitario ?? 0;
    
    // Try to get fabric description
    const proveedor = proveedores.find(p => p.id === expense.proveedorId);
    const tela = proveedor?.telas?.find(t => t.codigo === detalle.codigo_tela);
    const fabricDisplay = formatFabricDisplay(detalle.codigo_tela, tela?.descripcion);
    
    return [
      `Tela: ${fabricDisplay}`,
      `Metros: ${formatNumber(metros, 2)}`,
      `Valor/metro: ${formatCurrency(valorUnitario)}`
    ].join('\n');
  }
  
  if (tipo === 'Mensajería') {
    return [
      'Mensajería',
      `Empresa/Persona: ${detalle.empresa_persona || '—'}`,
      `Motivo: ${detalle.motivo || '—'}`,
      `Costo: ${formatCurrency(detalle.costo)}`
    ].join('\n');
  }
  
  if (tipo === 'Bordados') {
    const cantidad = Number(detalle.cantidad || 0);
    const precioUnitario = Number(detalle.precio_unitario || 0);
    
    return [
      'Bordados',
      `Bordadora: ${detalle.bordadora || '—'}`,
      `Descripción: ${truncateText(detalle.descripcion_bordado, 40) || '—'}`,
      `Colegio: ${detalle.colegio || '—'}`,
      `Cantidad: ${cantidad} • PU: ${formatCurrency(precioUnitario)}`
    ].join('\n');
  }
  
  if (tipo === 'Almuerzos') {
    return [
      'Almuerzos',
      `Detalle: ${truncateText(detalle.otros_detalle, 50) || '—'}`
    ].join('\n');
  }
  
  // Default for 'Otro' type
  return [
    'Otros',
    `Detalle: ${truncateText(detalle.otros_detalle, 50) || '—'}`
  ].join('\n');
};

/**
 * Get badge color class for expense type
 * @param {string} tipo - Expense type
 * @returns {string} CSS class name
 */
export const getExpenseTypeBadgeClass = (tipo) => {
  const typeClasses = {
    'Tela': 'gastos-badge--tela',
    'Mensajería': 'gastos-badge--mensajeria',
    'Bordados': 'gastos-badge--bordados',
    'Almuerzos': 'gastos-badge--almuerzos',
    'Otro': 'gastos-badge--otro'
  };
  
  return typeClasses[tipo] || 'gastos-badge--otro';
};

/**
 * Calculate KPI statistics from expenses array
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} KPI statistics
 */
export const calculateExpenseKPIs = (expenses) => {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.valor_total || 0), 0);
  const count = expenses.length;
  const average = count > 0 ? total / count : 0;
  
  // Group by type
  const byType = expenses.reduce((acc, expense) => {
    const tipo = expense.tipo || 'Otro';
    acc[tipo] = (acc[tipo] || 0) + Number(expense.valor_total || 0);
    return acc;
  }, {});
  
  // Find highest expense type
  const topType = Object.entries(byType)
    .sort(([,a], [,b]) => b - a)[0];
  
  return {
    total,
    count,
    average,
    byType,
    topType: topType ? { type: topType[0], amount: topType[1] } : null
  };
};