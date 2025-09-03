import React, { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";
import { useLoading } from "../context/LoadingContext.jsx";
import Spinner from "../components/Spinner.jsx";
import ModalBase from "../components/ModalBase.jsx";

const PERM_OPTIONS = [
  { key: "inventario", label: "Inventario" },
  { key: "ventas", label: "Ventas/Encargos" },
  { key: "clientes_pedidos", label: "Clientes & Pedidos" },
  { key: "stock", label: "Stock" },
  { key: "catalogo", label: "Catálogo" },
  { key: "proveedores", label: "Proveedores" },
  { key: "gastos", label: "Gastos" },
  { key: "modistas", label: "Gestión modistas" },
  { key: "reportes_modistas", label: "Reportes modistas" },
  { key: "usuarios", label: "Usuarios" },
];

const ALL_KEYS = PERM_OPTIONS.map((o) => o.key);
const emptyPermisos = () => ALL_KEYS.reduce((acc, k) => ((acc[k] = false), acc), {});
const arrayToPermisos = (arr = []) => {
  const p = emptyPermisos();
  (arr || []).forEach((k) => {
    const key = k === "reportes" ? "reportes_modistas" : k;
    if (key in p) p[key] = true;
  });
  return p;
};
const permisosToArray = (obj = {}) => ALL_KEYS.filter((k) => !!obj[k]);

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Usuario",
    permisos: emptyPermisos(),
  });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { permisos, role } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuarios = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), active: d.data().active !== false }));
      setUsers(usuarios);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim()) return;
    setIsSaving(true);
    showLoading();
    try {
      const ref = doc(collection(db, "users"));
      const permisosObj = newUser.role === "Admin" ? ALL_KEYS.reduce((a, k) => ((a[k] = true), a), {}) : newUser.permisos;
      const permissionsArr = permisosToArray(permisosObj);
      await setDoc(ref, { name: newUser.name, email: newUser.email, role: newUser.role, permisos: permisosObj, permissions: permissionsArr, active: true });
      setNewUser({ name: "", email: "", role: "Usuario", permisos: emptyPermisos() });
      setShowModal(false);
    } finally {
      hideLoading();
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    showLoading();
    try {
      const permisosObj = editingUser.role === "Admin" ? ALL_KEYS.reduce((a, k) => ((a[k] = true), a), {}) : (editingUser.permisos || emptyPermisos());
      const permissionsArr = permisosToArray(permisosObj);
      await updateDoc(doc(db, "users", editingUser.id), { role: editingUser.role, permisos: permisosObj, permissions: permissionsArr });
      setEditingUser(null);
      setShowModal(false);
    } finally {
      hideLoading();
      setIsSaving(false);
    }
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
      permisos: user.permisos ? { ...emptyPermisos(), ...user.permisos } : arrayToPermisos(user.permissions || []),
    });
    setShowModal(true);
  };

  const toggleNewUserPermission = (key) => setNewUser((prev) => ({ ...prev, permisos: { ...prev.permisos, [key]: !prev.permisos[key] } }));
  const toggleEditPermission = (key) => setEditingUser((prev) => ({ ...prev, permisos: { ...prev.permisos, [key]: !prev.permisos[key] } }));

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const isAdmin = String(role || "").toLowerCase() === "admin";
  if (!(isAdmin || permisos?.usuarios)) {
    return <div style={{ padding: 20 }}>Acceso restringido</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Gestión de Usuarios</h2>
      <button onClick={() => { setShowModal(true); setEditingUser(null); }} style={{ marginBottom: 20 }}>
        + Crear Usuario
      </button>

      {loading ? (
        <Spinner />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Nombre</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Correo</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Rol</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Permisos</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Estado</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const displayName = u.name || u.nickname || u.email || "Sin nombre";
              const displayEmail = u.email || "Sin correo";
              const permsObj = u.permisos || arrayToPermisos(u.permissions || []);
              const chips = ALL_KEYS.filter((k) => permsObj[k]);
              return (
                <tr key={u.id}>
                  <td style={{ padding: "8px 0" }}>{displayName}</td>
                  <td style={{ padding: "8px 0" }}>{displayEmail}</td>
                  <td>{u.role || "Usuario"}</td>
                  <td>
                    {chips.map((key) => (
                      <span key={key} className="chip">
                        {PERM_OPTIONS.find((o) => o.key === key)?.label || key}
                      </span>
                    ))}
                  </td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={u.active !== false} onChange={() => handleToggleActive(u.id, u.active !== false)} />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td>
                    <button onClick={() => openEditUser(u)} style={{ marginRight: 8, color: "white", backgroundColor: "#3b82f6", padding: "5px 10px", border: "none", borderRadius: 4, cursor: "pointer" }}>Editar</button>
                    <button onClick={() => handleDelete(u.id)} style={{ color: "white", backgroundColor: "red", padding: "5px 10px", border: "none", borderRadius: 4, cursor: "pointer" }}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ModalBase
        isOpen={!!(showModal || editingUser)}
        title={editingUser ? "Editar Usuario" : "Crear Usuario"}
        onClose={closeModal}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal} disabled={isSaving}>Cancelar</button>
            <button className="btn btn-primary" type="submit" form="user-form" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
          {editingUser ? (
            <>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" type="text" value={editingUser.name} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Correo</label>
                <input className="form-input" type="email" value={editingUser.email} readOnly />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nombre" required />
              </div>
              <div className="form-group">
                <label className="form-label">Correo</label>
                <input className="form-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Correo" required />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Rol</label>
            <select
              className="form-select"
              value={editingUser ? editingUser.role : newUser.role}
              onChange={(e) => (editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value }))}
            >
              <option value="Usuario">Usuario</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Permisos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {PERM_OPTIONS.map((opt) => (
                <label key={opt.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    disabled={(editingUser ? editingUser.role : newUser.role) === "Admin"}
                    checked={Boolean((editingUser ? editingUser.permisos : newUser.permisos)[opt.key])}
                    onChange={() => (editingUser ? toggleEditPermission(opt.key) : toggleNewUserPermission(opt.key))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </form>
      </ModalBase>
    </div>
  );
};

export default UserManagement;

