import React, { useState } from "react";

const StockTable = ({ stock }) => {
  const [colegiosAbiertos, setColegiosAbiertos] = useState({});

  // Agrupa stock por colegio
  const colegios = {};
  stock.forEach((item) => {
    if (!colegios[item.colegio]) colegios[item.colegio] = [];
    colegios[item.colegio].push(item);
  });

  const colegiosOrdenados = Object.keys(colegios).sort();

  // Orden de tallas
  const ordenGeneral = ["6", "8", "10", "12", "14", "16", "S", "M", "L", "XL", "XXL"];
  const ordenPantalon = ["6", "8", "10", "12", "14", "16", "28", "30", "32", "34", "36", "38", "40"];
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return (
    <div style={{ marginTop: 20 }}>
      {colegiosOrdenados.map((colegio) => (
        <div
          key={colegio}
          style={{
            marginBottom: 16,
            border: "1.5px solid #1976d2",
            borderRadius: 10,
            boxShadow: "0 2px 8px #0002",
            background: "#f8faff",
          }}
        >
          <div
            onClick={() =>
              setColegiosAbiertos((prev) => ({
                ...prev,
                [colegio]: !prev[colegio],
              }))
            }
            style={{
              cursor: "pointer",
              padding: 16,
              fontWeight: 600,
              fontSize: "1.1em",
              background: "#1976d2",
              color: "#fff",
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              {colegiosAbiertos[colegio] ? "▼" : "▶"} {colegio}
            </span>
            <span style={{ fontWeight: 400, fontSize: "0.9em" }}>
              {colegios[colegio].length} productos
            </span>
          </div>
          {colegiosAbiertos[colegio] && (
            <div style={{ padding: 8 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr>
                    <th style={estiloEncabezado}>Producto</th>
                    <th style={estiloEncabezado}>Talla</th>
                    <th style={estiloEncabezado}>Cantidad</th>
                    <th style={estiloEncabezado}>Vr. Unitario</th>
                    <th style={estiloEncabezado}>Vr. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...colegios[colegio]]
                    .sort((a, b) => {
                      if (a.prenda !== b.prenda)
                        return a.prenda.localeCompare(b.prenda);
                      const order = norm(a.prenda) === "pantalon" ? ordenPantalon : ordenGeneral;
                      const ia = order.indexOf(String(a.talla));
                      const ib = order.indexOf(String(b.talla));
                      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                    })
                    .map((item, idx) => {
                      const precio = parseInt(item.precio || 0);
                      const cantidad = parseInt(item.cantidad || 0);
                      const total = precio * cantidad;
                      return (
                        <tr key={item.id || idx}>
                          <td style={estiloCelda}>{item.prenda}</td>
                          <td style={estiloCelda}>{item.talla}</td>
                          <td style={estiloCelda}>{item.cantidad}</td>
                          <td style={estiloCelda}>
                            {precio.toLocaleString("es-CO")}
                          </td>
                          <td style={estiloCelda}>
                            {total.toLocaleString("es-CO")}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const estiloEncabezado = {
  padding: "10px",
  backgroundColor: "#e3e9ff",
  border: "1px solid #c5d5ee",
  fontWeight: "bold",
};

const estiloCelda = {
  padding: "10px",
  border: "1px solid #e3e9ff",
};

export default StockTable;
