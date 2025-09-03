import React from "react";

export default function CatalogToolbar({ producto, editandoId, onChange, onSubmit, onCancel }) {
  return (
    <div className="catalog-header">
      <h2 className="catalog-title">Catálogo de Productos</h2>
      <form className="catalog-toolbar" onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">Colegio</label>
          <input
            className="form-input"
            name="colegio"
            value={producto.colegio}
            onChange={onChange}
            placeholder="Colegio"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Producto</label>
          <input
            className="form-input"
            name="prenda"
            value={producto.prenda}
            onChange={onChange}
            placeholder="Producto"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Talla</label>
          <input
            className="form-input"
            name="talla"
            value={producto.talla}
            onChange={onChange}
            placeholder="Talla"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Precio</label>
          <input
            className="form-input"
            name="precio"
            type="number"
            min="0"
            value={producto.precio}
            onChange={onChange}
            placeholder="0"
            required
          />
        </div>
        <div className="toolbar-actions">
          <button className={`btn ${editandoId ? "btn-success" : "btn-primary"}`} type="submit">
            {editandoId ? "Actualizar" : "Agregar"}
          </button>
          {editandoId && (
            <button className="btn btn-danger" type="button" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

