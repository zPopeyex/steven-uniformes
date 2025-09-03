import React from "react";
import ProductoAccordion from "./ProductoAccordion.jsx";

export default function ColegioAccordion({ colegioObj, isExpanded, onToggle, expandedProducts, onProductToggle, onEdit, onDelete, onDownload, onAddSize }) {
  const totalProducts = colegioObj.productos.length;
  const panelId = `colegio-${colegioObj.colegio.replace(/\s/g, '-')}`;

  return (
    <div className="colegio-accordion">
      <div
        className="colegio-header"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <h2 className="colegio-title">
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
          {colegioObj.colegio}
        </h2>
        <div className="colegio-info">
          <span className="product-count">{totalProducts} producto{totalProducts !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className={`colegio-content ${isExpanded ? 'expanded' : ''}`} id={panelId}>
        {colegioObj.productos.map((prod) => (
          <ProductoAccordion
            key={`${colegioObj.colegio}-${prod.prenda}`}
            colegio={colegioObj.colegio}
            producto={prod}
            isExpanded={expandedProducts[prod.prenda] || false}
            onToggle={() => onProductToggle(prod.prenda)}
            onEdit={onEdit}
            onDelete={onDelete}
            onDownload={onDownload}
            onAddSize={(col, prenda) => onAddSize && onAddSize(col, prenda)}
          />
        ))}
      </div>
    </div>
  );
}
