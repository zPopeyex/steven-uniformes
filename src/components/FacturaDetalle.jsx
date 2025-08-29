// src/components/FacturaDetalle.jsx
import React from "react";
import InvoicePreview from "./invoices/InvoicePreview";

/**
 * Muestra una "factura bonita" para pedido | venta | encargo,
 * reutilizando el mismo componente InvoicePreview + plantillas.
 *
 * Props:
 *  - tipo: "pedidos" | "ventas" | "encargos"
 *  - template: objeto de plantilla (ventas/encargos/pedidos)
 *  - data: documento a renderizar
 */
export default function FacturaDetalle({ tipo = "pedidos", template, data }) {
  if (!data) return null;
  return (
    <div className="factura-detalle">
      <InvoicePreview template={template} data={data} />
    </div>
  );
}
