import React from "react";

export default function CatalogToolbar({ producto, handleChange, handleSubmit, editandoId, handleCancelEdit, totalItems }) {
  return (
    <div className="catalog-toolbar">
      <div className="toolbar-header">
        <h3 className="toolbar-title">
          <span role="img" aria-label="note">📝</span>
          {editandoId ? "Editar Producto" : "Agregar Nuevo Producto"}
        </h3>
        <div className="toolbar-stats">{totalItems} productos en catálogo</div>
      </div>

      <form onSubmit={handleSubmit} className="toolbar-form">
        <div className="form-group">
          <label className="form-label">Colegio</label>
          <input name="colegio" value={producto.colegio} onChange={handleChange} placeholder="Nombre del colegio" className="form-input" required />
        </div>
        <div className="form-group">
          <label className="form-label">Producto</label>
          <input name="prenda" value={producto.prenda} onChange={handleChange} placeholder="Nombre del producto" className="form-input" required />
        </div>
        <div className="form-group">
          <label className="form-label">Talla</label>
          <input name="talla" value={producto.talla} onChange={handleChange} placeholder="Talla" className="form-input" required />
        </div>
        <div className="form-group">
          <label className="form-label">Precio</label>
          <input name="precio" value={producto.precio} onChange={handleChange} placeholder="0" type="number" min="0" step="500" className="form-input" required />
        </div>
        <div className="form-group add-btn-group">
          <button type="submit" className={`add-btn ${editandoId ? "editing" : ""}`}>
            {editandoId ? (
              <>
                <span role="img" aria-label="save">💾</span> Actualizar
              </>
            ) : (
              <>
                <span role="img" aria-label="plus">➕</span> Agregar
              </>
            )}
          </button>
          {editandoId && (
            <button type="button" onClick={handleCancelEdit} className="cancel-btn">
              <span aria-hidden>✕</span> Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

