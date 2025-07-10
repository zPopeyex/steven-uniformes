// 📄 src/components/StockTable.jsx

import React from 'react';

const StockTable = ({ stock }) => {
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
            <th style={estiloEncabezado}>Fecha</th>
            <th style={estiloEncabezado}>Hora</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => (
            <tr key={index}>
              <td style={estiloCelda}>{item.colegio}</td>
              <td style={estiloCelda}>{item.prenda}</td>
              <td style={estiloCelda}>{item.talla}</td>
              <td style={estiloCelda}>{item.cantidad}</td>
              <td style={estiloCelda}>
                {item.precio ? item.precio.toLocaleString('es-CO') : '-'}
              </td>
              <td style={estiloCelda}>
                {item.total ? item.total.toLocaleString('es-CO') : '-'}
              </td>
              <td style={estiloCelda}>{item.fecha || '-'}</td>
              <td style={estiloCelda}>{item.hora || '-'}</td>
            </tr>
          ))}
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
