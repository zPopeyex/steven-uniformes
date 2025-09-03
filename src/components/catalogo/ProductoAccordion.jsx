import React from "react";
import TallasTable from "./TallasTable.jsx";

export default function ProductoAccordion({ colegio, producto, isExpanded, onToggle, onEdit, onDelete, onDownload, onAddSize }) {
  const totalSizes = producto.tallas.length;
  const panelId = `producto-${colegio.replace(/\s/g, '-')}-${producto.prenda.replace(/\s/g, '-')}`;

  return (
    <div className="producto-accordion">
      <div
        className="producto-header"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <h3 className="producto-title">
          <span className={`producto-expand ${isExpanded ? 'expanded' : ''}`}>▼</span>
          {producto.prenda}
          <span className="size-count">{totalSizes} talla{totalSizes !== 1 ? 's' : ''}</span>
        </h3>
        {typeof onAddSize === 'function' && (
          <button
            className="add-size-btn"
            onClick={(e) => { e.stopPropagation(); onAddSize(colegio, producto.prenda); }}
            aria-label={`Agregar talla para ${colegio} - ${producto.prenda}`}
          >
            <span>➕</span> Agregar Talla
          </button>
        )}
      </div>
      <div className={`producto-content ${isExpanded ? 'expanded' : ''}`} id={panelId}>
        <TallasTable colegio={colegio} producto={producto.prenda} tallas={producto.tallas} onEdit={onEdit} onDelete={onDelete} onDownload={onDownload} />
      </div>
    </div>
  );
}
