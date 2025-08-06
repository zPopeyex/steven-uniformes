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
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase/firebaseConfig";

const UserManagement = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ uid: "", name: "", role: "vendedor" });

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
    if (!newUser.uid.trim()) return;
    await setDoc(doc(db, "users", newUser.uid), {
      name: newUser.name,
      role: newUser.role,
    });
    setNewUser({ uid: "", name: "", role: "vendedor" });
  };

  const handleRoleChange = async (id, role) => {
    await updateDoc(doc(db, "users", id), { role });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "users", id));
  };

  if (!hasRole("admin")) {
    return <div style={{ padding: 20 }}>Acceso restringido</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 Gestión de Usuarios</h2>

      <form onSubmit={handleCreateUser} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={newUser.uid}
          onChange={(e) => setNewUser({ ...newUser, uid: e.target.value })}
          placeholder="UID"
          style={{ marginRight: 10, padding: 5 }}
        />
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
          <option value="vendedor">vendedor</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" style={{ padding: "5px 10px" }}>
          ➕ Crear Usuario
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>UID</th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Nombre</th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Rol
            </th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
            {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: "8px 0" }}>{user.id}</td>
              <td style={{ padding: "8px 0" }}>{user.name}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={{ padding: 5 }}
                >
                  <option value="vendedor">vendedor</option>
                  <option value="admin">admin</option>
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
