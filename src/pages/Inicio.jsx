// 📄 src/pages/Inicio.jsx

import React from 'react';
import { useAuth } from "../context/AuthContext";

const Inicio = () => {
const { user, role, name, logout } = useAuth();
return (
    <main className="home-main">
       
      {/* 👉 Este es el bloque de bienvenida moderno que quieres */}
      <section className="home-content">
        <h2><span role="img" aria-label="Bienvenida">🎯</span> Bienvenido al sistema</h2>
        <p>
          Esta aplicación te permite gestionar el inventario y las ventas del negocio <b>Steven Todo en Uniformes</b>,
          incluyendo el control por colegios, tallas, cantidades y stock.
        </p>
        <ul>
          <li>📦 Visualiza el stock actual</li>
          <li>➕ Agrega productos al inventario</li>
          <li>🗒️ Modulo de ventas, encargos, pagos y más</li>
        </ul>
        <p>Versión 1.0. Desarrollado por Leo 😎</p>
      </section>  
    </main>
  );
};

export default Inicio;
