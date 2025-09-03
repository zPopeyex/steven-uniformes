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

const NAV_ITEMS = [
  { key: "inventario", label: "Inventario", to: "/inventario", icon: FaPlus },
  { key: "ventas", label: "Ventas/Encargos", to: "/ventas", icon: FaMoneyBill },
  { key: "clientes_pedidos", label: "Clientes & Pedidos", to: "/clientes-pedidos", icon: FaMoneyBillAlt },
  { key: "stock", label: "Stock", to: "/stock", icon: FaBoxOpen },
  { key: "catalogo", label: "Catálogo", to: "/catalogo", icon: FaShoppingCart },
  { key: "proveedores", label: "Proveedores", to: "/proveedores", icon: FaTruck },
  { key: "gastos", label: "Gastos", to: "/gastos", icon: FaMoneyBillAlt },
  { key: "modistas", label: "Gestión modistas", to: "/modistas", icon: FaUserTie },
  { key: "reportes_modistas", label: "Reportes modistas", to: "/reportes-modistas", icon: FaChartBar },
  { key: "usuarios", label: "Usuarios", to: "/usuarios", icon: FaUsers },
];

const Sidebar = () => {
  const { permisos, role } = useAuth();
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const visibleItems = NAV_ITEMS.filter((it) => isAdmin || permisos?.[it.key]);

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
        <NavLink to="/" className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
          <FaHome className="menu-icon" />
          <span>Inicio</span>
        </NavLink>
        {visibleItems.map(({ key, label, to, icon: Icon }) => (
          <NavLink key={key} to={to} className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <Icon className="menu-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

