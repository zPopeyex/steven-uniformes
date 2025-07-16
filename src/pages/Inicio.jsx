// 📄 src/pages/Inicio.jsx

import React from 'react';

const Inicio = () => {
  return (
    <div style={{ marginTop: 30 }}>
      <h2>🎯 Bienvenido al sistema</h2>
      <p>
        Esta aplicación te permite gestionar el inventario y las ventas del negocio
        <strong> Steven Todo en Uniformes</strong>, incluyendo el control por colegios, tallas, cantidades y stock.
      </p>
      <ul>
        <li>📦 Visualiza el stock actual</li>
        <li>➕ Agrega productos al inventario</li>
        <li>🧾 Futuro módulo de ventas, encargos, pagos, etc.</li>
      </ul>
      <p style={{ marginTop: 20 }}>Versión 1.0. Dev Leo 😎</p>
    </div>
  );
};

export default Inicio;
