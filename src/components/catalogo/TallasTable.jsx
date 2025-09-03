import React from "react";
import BarcodePreview from "./BarcodePreview.jsx";

export default function TallasTable({ colegio, producto, tallas, onEdit, onDelete, onDownload }) {
  return (
    <div className="sizes-table-container">
      <table className="sizes-table">
        <thead>
          <tr>
            <th>Talla</th>
            <th>Precio</th>
            <th>Código de Barras</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tallas.map((t) => {
            const codeValue = `${colegio}-${producto}-${t.talla}-${t.precio}`;
            return (
              <tr key={t.id}>
                <td className="size-cell">{t.talla}</td>
                <td className="price-cell">${Number(t.precio).toLocaleString('es-CO')}</td>
                <td className="barcode-cell">
                  <div className="barcode-preview" data-barcode-id={codeValue}>
                    <BarcodePreview value={codeValue} height={28} />
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button onClick={() => onEdit({ id: t.id, colegio, prenda: producto, talla: t.talla, precio: t.precio })} className="action-btn edit-btn" title="Editar producto" aria-label={`Editar ${producto} talla ${t.talla}`}>
                      <span role="img" aria-label="editar">✏️</span>Editar
                    </button>
                    <button onClick={() => onDelete(t.id)} className="action-btn delete-btn" title="Eliminar producto" aria-label={`Eliminar ${producto} talla ${t.talla}`}>
                      <span role="img" aria-label="eliminar">🗑️</span>Eliminar
                    </button>
                    <button onClick={() => onDownload(codeValue, `barcode_${colegio}_${producto}_${t.talla}`)} className="action-btn download-btn" title="Descargar código de barras" aria-label={`Descargar código de barras de ${producto} talla ${t.talla}`}>
                      <span role="img" aria-label="descargar">📥</span>Descargar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

