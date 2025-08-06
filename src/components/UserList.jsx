import React from "react";

const UserList = ({ users, onRoleChange, onDelete }) => (
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
              onChange={(e) => onRoleChange(user.id, e.target.value)}
              style={{ padding: 5 }}
            >
              <option value="Usuario">Usuario</option>
              <option value="Admin">Admin</option>
            </select>
          </td>
          <td>
            <button
              onClick={() => onDelete(user.id)}
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
);

export default UserList;

