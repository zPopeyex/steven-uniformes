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
import UserForm from "../components/UserForm";
import UserList from "../components/UserList";

const Users = () => {
  const [users, setUsers] = useState([]);
  const role = localStorage.getItem("role") || "Usuario";

  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usuarios = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(usuarios);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (user) => {
    const ref = doc(collection(db, "users"));
    await setDoc(ref, user);
  };

  const handleRoleChange = async (id, newRole) => {
    await updateDoc(doc(db, "users", id), { role: newRole });
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
      <UserForm onCreate={handleCreateUser} />
      <UserList users={users} onRoleChange={handleRoleChange} onDelete={handleDelete} />
    </div>
  );
};

export default Users;

