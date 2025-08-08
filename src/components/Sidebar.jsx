import { NavLink } from "react-router-dom";
import { FaTshirt, FaHome, FaPlus, FaBoxOpen, FaMoneyBill, FaShoppingCart, FaUsers } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/sidebar.css";

const Sidebar = () => {
  const { permissions } = useAuth();

  return (
    <aside className="sidebar">
      <div className="logo-row">
        <FaTshirt className="logo-icon" />
        <span className="logo-title">Steven Todo</span>
      </div>
      <nav className="menu">
        <NavLink to="/" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
          <FaHome className="menu-icon" />
          <span>Inicio</span>
        </NavLink>
        {permissions.includes("inventario") && (
          <NavLink to="/inventario" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <FaPlus className="menu-icon" />
            <span>Agregar Inventario</span>
          </NavLink>
        )}
        {permissions.includes("stock") && (
          <NavLink to="/stock" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <FaBoxOpen className="menu-icon" />
            <span>Ver Stock Actual</span>
          </NavLink>
        )}
        {permissions.includes("ventas") && (
          <NavLink to="/ventas" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <FaMoneyBill className="menu-icon" />
            <span>Ventas/Encargos</span>
          </NavLink>
        )}
        {permissions.includes("catalogo") && (
          <NavLink to="/catalogo" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <FaShoppingCart className="menu-icon" />
            <span>Catálogo de Productos</span>
          </NavLink>
        )}
        {permissions.includes("usuarios") && (
          <NavLink to="/usuarios" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <FaUsers className="menu-icon" />
            <span>Usuarios</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
