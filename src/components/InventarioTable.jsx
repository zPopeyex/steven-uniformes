import React from 'react';

const InventarioTable = ({ productos = [], onEliminar }) => {
  return (
    <table border="1" cellPadding="10" style={{
      marginTop: '20px',
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#fff',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      <thead>
        <tr>
          <th>Nombre Plantel</th>
          <th>Producto</th>
          <th>Talla</th>
          <th>Cantidad</th>
          <th>Vr. Unitario</th>
          <th>Vr. Total</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => (
          <tr key={p.id}>
            <td>{p.colegio}</td>
            <td>{p.prenda}</td>
            <td>{p.talla}</td>
            <td>{p.cantidad}</td>
            <td>{p.precio}</td>
            <td>{p.total}</td>
            <td>{p.fecha}</td>
            <td>{p.hora}</td>
            <td>
              <button
                onClick={() => onEliminar(p.id)}
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InventarioTable;
