// 📄 src/pages/Stock.jsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';


const Stock = () => {
  const [productos, setProductos] = useState([]);

  const cargarStock = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'inventario_stock'));
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Ordenamos por colegio, producto, talla
      productosData.sort((a, b) => a.colegio.localeCompare(b.colegio) || a.prenda.localeCompare(b.prenda) || parseInt(a.talla) - parseInt(b.talla));

      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando inventario_stock:', error);
    }
  };

  useEffect(() => {
    cargarStock();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Inventario Actual (Stock)</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr>
            <th style={estiloTh}>Colegio</th>
            <th style={estiloTh}>Producto</th>
            <th style={estiloTh}>Talla</th>
            <th style={estiloTh}>Cantidad</th>
            <th style={estiloTh}>Precio</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(prod => (
            <tr key={prod.id}>
              <td style={estiloTd}>{prod.colegio}</td>
              <td style={estiloTd}>{prod.prenda}</td>
              <td style={estiloTd}>{prod.talla}</td>
              <td style={estiloTd}>{prod.cantidad}</td>
              <td style={estiloTd}>${prod.precio?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const estiloTh = {
  backgroundColor: '#333',
  color: 'white',
  padding: '8px',
  border: '1px solid #ccc',
};

const estiloTd = {
  padding: '8px',
  border: '1px solid #ccc',
  textAlign: 'center',
};

export default Stock;
