import React from "react";

export default function ProductoAccordion({ producto, abierto, onToggle, tallasCount, onAdd, children }) {
  return (
    <section className="accordion nested">
      <header
        className="accordion-subheader"
        role="button"
        aria-expanded={abierto}
        onClick={onToggle}
      >
        <div className="accordion-title">
          <span className="caret" aria-hidden>{abierto ? "▾" : "▸"}</span>
          <span className="title-text">{producto}</span>
          <span className="badge badge-light">{tallasCount} tallas</span>
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

