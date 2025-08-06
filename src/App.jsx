import { Link, Route, Routes } from 'react-router-dom';
import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';
import Stock from './pages/Stock';
import Catalogo from './pages/Catalogo';
import Ventas from './pages/Ventas';
import GestionUsuarios from './pages/GestionUsuarios';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <h1>🧵 Steven Todo en Uniformes</h1>

      {user && (
        <div style={{ marginBottom: 30 }}>
          <Link to="/" style={botonEstilo}>🏠 Inicio</Link>
          {user.role === 'Admin' && (
            <>
              <Link to="/inventario" style={botonEstilo}>➕ Agregar Inventario</Link>
              <Link to="/stock" style={botonEstilo}>📦 Ver Stock Actual</Link>
              <Link to="/catalogo" style={botonEstilo}>🛒 Catálogo de Productos</Link>
              <Link to="/gestion-usuarios" style={botonEstilo}>👥 Gestión de Usuarios</Link>
            </>
          )}
          {(user.role === 'Vendedor' || user.role === 'Admin') && (
            <Link to="/ventas" style={botonEstilo}>💵 Ventas/Encargos</Link>
          )}
          <button onClick={logout} style={botonEstilo}>Cerrar sesión</button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Vendedor']}>
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Inventario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogo"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Catalogo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestion-usuarios"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <GestionUsuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ventas"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Vendedor']}>
              <Ventas />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

const botonEstilo = {
  marginRight: '10px',
  padding: '10px 15px',
  backgroundColor: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  textDecoration: 'none',
};

export default App;
