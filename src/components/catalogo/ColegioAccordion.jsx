import React from "react";

export default function ColegioAccordion({ colegio, abierto, onToggle, productosCount, children, onAdd }) {
  return (
    <section className="accordion card">
      <header
        className="accordion-header header-blue"
        role="button"
        aria-expanded={abierto}
        onClick={onToggle}
      >
        <div className="accordion-title">
          <span className="caret" aria-hidden>{abierto ? "▾" : "▸"}</span>
          <span className="title-text">{colegio}</span>
          <span className="badge badge-light">{productosCount} productos</span>
        </div>
        {onAdd && (
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onAdd(); }}>
            + Agregar Talla
          </button>
        )}
      </header>
      {abierto && <div className="accordion-body">{children}</div>}
    </section>
  );
}

