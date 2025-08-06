import React, { useState } from "react";

const UserForm = ({ onCreate }) => {
  const [newUser, setNewUser] = useState({ name: "", role: "Usuario" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newUser.name.trim()) return;
    onCreate(newUser);
    setNewUser({ name: "", role: "Usuario" });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
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
  );
};

export default UserForm;

