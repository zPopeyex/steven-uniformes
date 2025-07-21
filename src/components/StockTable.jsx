// 📄 src/components/StockTable.jsx

import React from 'react';

const StockTable = ({ stock }) => {
  const convertirFecha = (fechaHora) => {
    if (!fechaHora || !fechaHora.seconds) return "-";
    const date = new Date(fechaHora.seconds * 1000);
    return date.toLocaleDateString("es-CO");
  };

  const convertirHora = (fechaHora) => {
    if (!fechaHora || !fechaHora.seconds) return "-";
    const date = new Date(fechaHora.seconds * 1000);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <table style={{ border: '1px solid #ddd', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={estiloEncabezado}>Nombre Plantel</th>
            <th style={estiloEncabezado}>Producto</th>
            <th style={estiloEncabezado}>Talla</th>
            <th style={estiloEncabezado}>Cantidad</th>
            <th style={estiloEncabezado}>Vr. Unitario</th>
            <th style={estiloEncabezado}>Vr. Total</th>

          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => {
            const precio = parseInt(item.precio || 0);
            const cantidad = parseInt(item.cantidad || 0);
            const total = precio * cantidad;

            return (
              <tr key={index}>
                <td style={estiloCelda}>{item.colegio}</td>
                <td style={estiloCelda}>{item.prenda}</td>
                <td style={estiloCelda}>{item.talla}</td>
                <td style={estiloCelda}>{item.cantidad}</td>
                <td style={estiloCelda}>{precio.toLocaleString('es-CO')}</td>
                <td style={estiloCelda}>{total.toLocaleString('es-CO')}</td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const estiloEncabezado = {
  padding: '10px',
  backgroundColor: '#f4f4f4',
  border: '1px solid #ddd',
  fontWeight: 'bold',
};

const estiloCelda = {
  padding: '10px',
  border: '1px solid #ddd',
};

export default StockTable;
