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
import { useLoading } from "../context/LoadingContext.jsx";
import Spinner from "../components/Spinner.jsx";

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
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { permissions } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuarios = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        active: d.data().active !== false,
      }));
      setUsers(usuarios);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim()) return;
    showLoading();
    const ref = doc(collection(db, "users"));
    await setDoc(ref, {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions,
      active: true,
    });
    hideLoading();
    setNewUser({ name: "", email: "", role: "Usuario", permissions: [] });
    setShowModal(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    showLoading();
    await updateDoc(doc(db, "users", editingUser.id), {
      role: editingUser.role,
      permissions: editingUser.permissions,
    });
    hideLoading();
    setEditingUser(null);
    setShowModal(false);
  };

  const handleToggleActive = async (id, current) => {
    showLoading();
    await updateDoc(doc(db, "users", id), { active: !current });
    hideLoading();
  };

  const handleDelete = async (id) => {
    showLoading();
    await deleteDoc(doc(db, "users", id));
    hideLoading();
  };

  const openEditUser = (user) => {
    setEditingUser({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "Usuario",
      permissions: user.permissions || [],
    });
    setShowModal(true);
  };

  const toggleNewUserPermission = (option) => {
    setNewUser((prev) => {
      const perms = prev.permissions.includes(option)
        ? prev.permissions.filter((p) => p !== option)
        : [...prev.permissions, option];
      return { ...prev, permissions: perms };
    });
  };

  const toggleEditPermission = (option) => {
    setEditingUser((prev) => {
      const perms = prev.permissions.includes(option)
        ? prev.permissions.filter((p) => p !== option)
        : [...prev.permissions, option];
      return { ...prev, permissions: perms };
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  if (!permissions.includes("usuarios")) {
    return <div style={{ padding: 20 }}>Acceso restringido</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 Gestión de Usuarios</h2>
      <button
        onClick={() => {
          setShowModal(true);
          setEditingUser(null);
        }}
        style={{ marginBottom: 20 }}
      >
        ➕ Crear Usuario
      </button>

      {loading ? (
        <Spinner />
      ) : (
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
                Permisos
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                Estado
              </th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const displayName =
                user.name || user.nickname || user.email || "Sin nombre";
              const displayEmail = user.email || "Sin correo";
              const roleClass = `badge badge--fixed ${(user.role || "usuario")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace("ñ", "n")}`;
              return (
                <tr key={user.id}>
                  <td style={{ padding: "8px 0" }}>{displayName}</td>
                  <td style={{ padding: "8px 0" }}>{displayEmail}</td>
                  <td>
                    <span className={roleClass}>{user.role}</span>
                  </td>
                  <td>
                    {(user.permissions || []).map((perm) => (
                      <span key={perm} className="chip">
                        {OPTION_LIST.find((o) => o.key === perm)?.label || perm}
                      </span>
                    ))}
                  </td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={user.active}
                        onChange={() =>
                          handleToggleActive(user.id, user.active)
                        }
                      />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td>
                    <button
                      onClick={() => openEditUser(user)}
                      style={{
                        marginRight: 8,
                        color: "white",
                        backgroundColor: "#3b82f6",
                        padding: "5px 10px",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
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
              );
            })}
          </tbody>
        </table>
      )}

      {(showModal || editingUser) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {editingUser ? "Editar Usuario" : "Crear Usuario"}
            </h3>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? (
                <>
                  <p>
                    <strong>{editingUser.name}</strong>
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#555" }}>
                    {editingUser.email}
                  </p>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    placeholder="Nombre"
                    style={{ marginRight: 10, padding: 5, marginBottom: 10 }}
                  />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="Correo"
                    style={{ marginRight: 10, padding: 5, marginBottom: 10 }}
                  />
                </>
              )}
              <select
                value={editingUser ? editingUser.role : newUser.role}
                onChange={(e) =>
                  editingUser
                    ? setEditingUser({ ...editingUser, role: e.target.value })
                    : setNewUser({ ...newUser, role: e.target.value })
                }
                style={{ marginRight: 10, padding: 5, marginBottom: 10 }}
              >
                <option value="Usuario">Usuario</option>
                <option value="Admin">Admin</option>
              </select>
              <div style={{ margin: "10px 0" }}>
                {OPTION_LIST.map((opt) => (
                  <label key={opt.key} style={{ marginRight: 10 }}>
                    <input
                      type="checkbox"
                      checked={(editingUser
                        ? editingUser.permissions
                        : newUser.permissions
                      ).includes(opt.key)}
                      onChange={() =>
                        editingUser
                          ? toggleEditPermission(opt.key)
                          : toggleNewUserPermission(opt.key)
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div style={{ textAlign: "right" }}>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
