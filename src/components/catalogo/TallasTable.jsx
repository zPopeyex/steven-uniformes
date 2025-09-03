import React, { useEffect, useState } from "react";
import BarcodePreview from "./BarcodePreview.jsx";

function useIsMobile() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return w < 768;
}

export default function TallasTable({ colegio, prenda, tallas, renderBarcode, onEditar, onEliminar, onDescargar }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="tallas-cards">
        {tallas.map((t) => {
          const codeValue = `${colegio}-${prenda}-${t.talla}-${t.precio}`;
          return (
            <div className="talla-card" key={t.id}>
              <div className="card-row">
                <div className="talla-pill">{t.talla}</div>
                <div className="price">${Number(t.precio).toLocaleString("es-CO")}</div>
              </div>
              <div className="card-actions">
                <button className="btn btn-warning btn-sm" onClick={() => onEditar({ id: t.id, colegio, prenda, talla: t.talla, precio: t.precio })}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => onEliminar(t.id)}>Eliminar</button>
                <button className="btn btn-success btn-sm" onClick={() => onDescargar(codeValue, `barcode_${colegio}_${prenda}_${t.talla}`)}>Descargar</button>
              </div>
              <details className="code-details">
                <summary>Ver código</summary>
                <div className="barcode-box">
                  <BarcodePreview height={48}>{renderBarcode(codeValue, 48)}</BarcodePreview>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <table className="tallas-table">
      <thead>
        <tr>
          <th>Talla</th>
          <th>Precio</th>
          <th>Código</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {tallas.map((t) => {
          const codeValue = `${colegio}-${prenda}-${t.talla}-${t.precio}`;
          return (
            <tr key={t.id}>
              <td className="td-strong">{t.talla}</td>
              <td>${Number(t.precio).toLocaleString("es-CO")}</td>
              <td>
                <div className="barcode-box">
                  <BarcodePreview>{renderBarcode(codeValue, 28)}</BarcodePreview>
                </div>
              </td>
              <td>
                <div className="actions-group">
                  <button className="btn btn-warning btn-sm" onClick={() => onEditar({ id: t.id, colegio, prenda, talla: t.talla, precio: t.precio })}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onEliminar(t.id)}>Eliminar</button>
                  <button className="btn btn-success btn-sm" onClick={() => onDescargar(codeValue, `barcode_${colegio}_${prenda}_${t.talla}`)}>Descargar</button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

