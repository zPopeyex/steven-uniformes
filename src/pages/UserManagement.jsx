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
import { useAuth } from "../contexts/AuthContext.jsx";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", role: "Usuario" });
  const { role } = useAuth();

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
    await setDoc(ref, { name: newUser.name, role: newUser.role });
    setNewUser({ name: "", role: "Usuario" });
  };

  const handleRoleChange = async (id, role) => {
    await updateDoc(doc(db, "users", id), { role });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
  };

  if (role !== "Admin") {
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
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          style={{ marginRight: 10, padding: 5 }}
        >
          <option value="Usuario">Usuario</option>
          <option value="Admin">Admin</option>
        </select>
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
              Rol
            </th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: "8px 0" }}>{user.name}</td>
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
