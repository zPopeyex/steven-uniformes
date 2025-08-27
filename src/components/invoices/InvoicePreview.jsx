import React from "react";

export default function InvoicePreview({ template, data }) {
  // Datos fijos de tu empresa
  const COMPANY = {
    name: "Steven Todo en Uniformes",
    nit: "1107103511-4",
    phonePretty: "317 284 1355",
    phoneWa: "573172841355", // formato internacional para WhatsApp (Colombia: 57)
  };
  return (
    <div className="invoice-preview">
      <div
        className="invoice-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        {/* IZQUIERDA: Logo + info empresa */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={template.logoUrl /* p.ej. https://i.imgur.com/XXXXX.png */}
            alt="Logo"
            className="invoice-logo"
            style={{ maxHeight: 80, maxWidth: 200, objectFit: "contain" }}
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.src =
                "data:image/svg+xml;utf8," +
                encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80'>
            <rect width='100%' height='100%' fill='#0052CC'/>
            <text x='50%' y='55%' font-family='Segoe UI' font-size='26' fill='white' text-anchor='middle'>LOGO</text>
          </svg>`);
            }}
          />
          <div className="company-info" style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#0052CC" }}>
              {COMPANY.name}
            </div>
            <div style={{ fontSize: 13, color: "#374151" }}>
              NIT: {COMPANY.nit}
            </div>
            <a>📞</a>
            <a
              href={`https://wa.me/${COMPANY.phoneWa}`}
              target="_blank"
              rel="noreferrer"
              data-ctype="company-wa"
              style={{
                fontSize: 13,
                color: "#1f7a1f",
                textDecoration: "underline",
                cursor: "pointer", // 👈 añade cursor
                display: "inline-block", // 👈 agrega caja
                padding: "2px 6px", // 👈 agranda la caja del enlace
                fontWeight: 600,
              }}
              title="Chatear por WhatsApp"
            >
              {COMPANY.phonePretty}
            </a>
          </div>
        </div>

        {/* DERECHA: Detalles de la factura */}
        <div className="invoice-details" style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>{template.headerText || "FACTURA"}</h2>
          <p style={{ margin: "6px 0" }}>
            <strong>Nº:</strong> {data.numero || data.id}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Fecha:</strong>{" "}
            {new Date(data.createdAt || Date.now()).toLocaleDateString("es-CO")}
          </p>
        </div>
      </div>

      {template.camposVisibles?.cliente && data.cliente && (
        <div style={{ marginTop: 20 }}>
          <h3>Datos del Cliente</h3>
          <p>
            <strong>Nombre:</strong> {data.cliente.nombre}
          </p>
          {template.camposVisibles?.cedula && (
            <p>
              <strong>Cédula/NIT:</strong> {data.cliente.cedulaNit}
            </p>
          )}
          {template.camposVisibles?.telefono && (
            <p>
              <strong>Teléfono:</strong> {data.cliente.telefono}
            </p>
          )}
          {template.camposVisibles?.direccion && (
            <p>
              <strong>Dirección:</strong> {data.cliente.direccion}
            </p>
          )}
        </div>
      )}

      <table className="invoice-table" style={{ marginTop: 30 }}>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Plantel</th>
            <th>Talla</th>
            <th>Cantidad</th>
            <th>Vr. Unitario</th>
            <th>Vr. Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item, i) => (
            <tr key={i}>
              <td>{item.producto}</td>
              <td>{item.plantel}</td>
              <td>{item.talla}</td>
              <td>{item.cantidad}</td>
              <td>${item.vrUnitario?.toLocaleString()}</td>
              <td>${item.vrTotal?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-total">
        <p>
          <strong>Total:</strong> ${data.total?.toLocaleString()}
        </p>
        {template.camposVisibles?.abono && (
          <p>
            <strong>Abono:</strong> ${data.abono?.toLocaleString()}
          </p>
        )}
        {template.camposVisibles?.saldo && (
          <p>
            <strong>Saldo:</strong> ${data.saldo?.toLocaleString()}
          </p>
        )}
      </div>

      {template.camposVisibles?.notas && data.observaciones && (
        <div style={{ marginTop: 20 }}>
          <p>
            <strong>Observaciones:</strong> {data.observaciones}
          </p>
        </div>
      )}

      {template.footerText && (
        <div style={{ marginTop: 40, textAlign: "center", color: "#6b7280" }}>
          <p>{template.footerText}</p>
        </div>
      )}
    </div>
  );
}
