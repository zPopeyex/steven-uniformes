// 📄 src/pages/Inicio.jsx

import React from 'react';
import { useAuth } from "../context/AuthContext";

const Inicio = () => {
const { user, role, name, logout } = useAuth();
  return (
    <main className="home-main">
      <header className="home-header">
        <div className="logo-title">
          <span className="emoji-logo" role="img" aria-label="logo">⏳</span>
          <h1>Steven Todo en Uniformes</h1>
        </div>
        <div className="user-area">
          {user?.photoURL && (
            <img className="avatar" src={user.photoURL} alt="avatar" />
          )}
          <span>
            Bienvenido, <strong>{name || user?.displayName || "Usuario"}</strong> ({role || "Usuario"})
          </span>
          <button className="btn-primary" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <nav className="home-nav">
        <button className="nav-btn active"><span role="img" aria-label="Inicio">🏠</span> Inicio</button>
        <button className="nav-btn"><span role="img" aria-label="Agregar">➕</span> Agregar Inventario</button>
        <button className="nav-btn"><span role="img" aria-label="Stock">📦</span> Ver Stock Actual</button>
        <button className="nav-btn"><span role="img" aria-label="Ventas">💵</span> Ventas/Encargos</button>
        <button className="nav-btn"><span role="img" aria-label="Catálogo">🛒</span> Catálogo de Productos</button>
        <button className="nav-btn"><span role="img" aria-label="Usuarios">👥</span> Usuarios</button>
      </nav>
    </main>
  );
};

export default Inicio;
