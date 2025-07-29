// CardTable.jsx
import React from "react";

export default function CardTable({ title, children, color = "#e3e9ff" }) {
  return (
    <div
      style={{
        marginBottom: 24,
        border: `1.5px solid ${color}`,
        borderRadius: 14,
        boxShadow: "0 2px 10px #1976d229",
        background: color,
        padding: 0,
      }}
    >
      <div
        style={{
          padding: 18,
          background: color,
          color: "#1976d2",
          fontWeight: 700,
          fontSize: "1.14em",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottom: "1.5px solid #dde6fa",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "0 14px 18px 14px" }}>{children}</div>
    </div>
  );
}
