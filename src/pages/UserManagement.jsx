// 📄 src/pages/UserManagement.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";

const OPTION_LIST = [
  { key: "inventario", label: "Inventario" },
  { key: "stock", label: "Stock" },
  { key: "ventas", label: "Ventas" },
  { key: "catalogo", label: "Catálogo" },
  { key: "usuarios", label: "Usuarios" },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Usuario",
    permissions: [],
  });
  const { permissions } = useAuth();

  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuarios = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(usuarios);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim()) return;
    const ref = doc(collection(db, "users"));
    await setDoc(ref, {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions,
    });
    setNewUser({ name: "", email: "", role: "Usuario", permissions: [] });
  };

  const handleRoleChange = async (id, role) => {
    await updateDoc(doc(db, "users", id), { role });
  };

  const handlePermissionChange = async (id, option, current = []) => {
    const perms = current.includes(option)
      ? current.filter((p) => p !== option)
      : [...current, option];
    await updateDoc(doc(db, "users", id), { permissions: perms });
  };

  const toggleNewUserPermission = (option) => {
    setNewUser((prev) => {
      const perms = prev.permissions.includes(option)
        ? prev.permissions.filter((p) => p !== option)
        : [...prev.permissions, option];
      return { ...prev, permissions: perms };
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
  };

  if (!permissions.includes("usuarios")) {
    return <div style={{ padding: 20 }}>Acceso restringido</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 Gestión de Usuarios</h2>

      <form onSubmit={handleCreateUser} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          placeholder="Nombre"
          style={{ marginRight: 10, padding: 5 }}
        />
        <input
          type="email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          placeholder="Correo"
          style={{ marginRight: 10, padding: 5 }}
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          style={{ marginRight: 10, padding: 5 }}
        >
          <option value="Usuario">Usuario</option>
          <option value="Admin">Admin</option>
        </select>
        <div style={{ margin: "10px 0" }}>
          {OPTION_LIST.map((opt) => (
            <label key={opt.key} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={newUser.permissions.includes(opt.key)}
                onChange={() => toggleNewUserPermission(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <button type="submit" style={{ padding: "5px 10px" }}>
          ➕ Crear Usuario
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Nombre
            </th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Correo
            </th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Rol
            </th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Opciones
            </th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: "8px 0" }}>{user.name}</td>
              <td style={{ padding: "8px 0" }}>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={{ padding: 5 }}
                >
                  <option value="Usuario">Usuario</option>
                  <option value="Admin">Admin</option>
                </select>
              </td>
              <td>
                {OPTION_LIST.map((opt) => (
                  <label key={opt.key} style={{ marginRight: 10 }}>
                    <input
                      type="checkbox"
                      checked={(user.permissions || []).includes(opt.key)}
                      onChange={() =>
                        handlePermissionChange(
                          user.id,
                          opt.key,
                          user.permissions || []
                        )
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </td>
              <td>
                <button
                  onClick={() => handleDelete(user.id)}
                  style={{
                    color: "white",
                    backgroundColor: "red",
                    padding: "5px 10px",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
