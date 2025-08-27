import { NavLink } from "react-router-dom";
import {
  FaTshirt,
  FaHome,
  FaPlus,
  FaBoxOpen,
  FaMoneyBill,
  FaShoppingCart,
  FaUsers,
  FaUserTie,
  FaChartBar,
  FaTruck,
  FaMoneyBillAlt,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/sidebar.css";

const Sidebar = () => {
  const { permissions } = useAuth();

  return (
    <aside className="sidebar">
      <div className="logo-row">
        <FaTshirt className="logo-icon" />
        <span className="logo-title">
          Steven <br />
          Todo en Uniformes
        </span>
      </div>
      <nav className="menu">
        <NavLink
          to="/"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <FaHome className="menu-icon" />
          <span>Inicio</span>
        </NavLink>
        {permissions.includes("inventario") && (
          <NavLink
            to="/inventario"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaPlus className="menu-icon" />
            <span>Agregar Inventario</span>
          </NavLink>
        )}
        {permissions.includes("stock") && (
          <NavLink
            to="/stock"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaBoxOpen className="menu-icon" />
            <span>Ver Stock Actual</span>
          </NavLink>
        )}
        {permissions.includes("ventas") && (
          <NavLink
            to="/ventas"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaMoneyBill className="menu-icon" />
            <span>Ventas/Encargos</span>
          </NavLink>
        )}
        {permissions.includes("catalogo") && (
          <NavLink
            to="/catalogo"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaShoppingCart className="menu-icon" />
            <span>Catálogo de Productos</span>
          </NavLink>
        )}
        {permissions.includes("modistas") && (
          <NavLink
            to="/modistas"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaUserTie className="menu-icon" />
            <span>Gestión de Modistas</span>
          </NavLink>
        )}
        {permissions.includes("reportes") && (
          <NavLink
            to="/reportes-modistas"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaChartBar className="menu-icon" />
            <span>Reportes de Modistas</span>
          </NavLink>
        )}
        {permissions.includes("usuarios") && (
          <NavLink
            to="/usuarios"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaUsers className="menu-icon" />
            <span>Usuarios</span>
          </NavLink>
        )}
        {permissions.includes("usuarios") && (
          <NavLink
            to="/proveedores"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaTruck className="menu-icon" />
            <span>Proveedores</span>
          </NavLink>
        )}
        {permissions.includes("usuarios") && (
          <NavLink
            to="/gastos"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaMoneyBillAlt className="menu-icon" />
            <span>Gastos</span>
          </NavLink>
        )}
        {permissions.includes("usuarios") && (
          <NavLink
            to="/clientes-pedidos"
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <FaMoneyBillAlt className="menu-icon" />
            <span>Clientes pedidos</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
