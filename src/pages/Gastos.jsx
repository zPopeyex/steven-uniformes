// src/pages/Gastos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  doc,
} from "firebase/firestore";

const UI = {
  primary: "#0052CC",
  primaryHover: "#0040A3",
  green: "#21ba45",
  border: "#E5E7EB",
  radius: 14,
  shadow: "0 12px 28px rgba(0,0,0,.08)",
  headerBg: "#F3F6FF",
};

const card = {
  background: "#fff",
  borderRadius: UI.radius,
  boxShadow: UI.shadow,
  padding: 16,
};

// 👇 más “aire” en inputs/labels
const input = {
  height: 46,
  padding: "12px 14px",
  borderRadius: UI.radius,
  border: `1px solid ${UI.border}`,
  outline: "none",
  width: "100%",
};
const label = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 8,
  display: "block",
  fontWeight: 600,
};
const btn = (bg = UI.primary, color = "#fff") => ({
  height: 44,
  padding: "0 16px",
  borderRadius: UI.radius,
  border: "1px solid transparent",
  background: bg,
  color,
  cursor: "pointer",
  fontWeight: 700,
});

const TIPOS = ["Tela", "Mensajería", "Bordados", "Almuerzos", "Otro"];

export default function Gastos() {
  // ----- formulario actual -----
  const [proveedores, setProveedores] = useState([]);
  const [tipo, setTipo] = useState("Tela");
  const [proveedorId, setProveedorId] = useState("");
  const [fechaHora, setFechaHora] = useState(defaultLocalDT());
  const [detalle, setDetalle] = useState({
    codigo_tela: "",
    metros: "",
    valor_total: "",
    empresa_persona: "",
    costo: "",
    motivo: "",
    bordadora: "",
    descripcion_bordado: "",
    colegio: "",
    cantidad: "",
    precio_unitario: "",
    otros_detalle: "",
  });

  // ----- lista de pendientes para guardar en lote -----
  const [pendientes, setPendientes] = useState([]);

  // ----- filtros tabla -----
  const [fDesde, setFDesde] = useState(firstDayOfYearLocal());
  const [fHasta, setFHasta] = useState(dateOnlyLocal(new Date()));
  const [fTipo, setFTipo] = useState("");
  const [fProv, setFProv] = useState("");

  // ----- tabla -----
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);

  // ----- helpers fecha -----
  function defaultLocalDT() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  function dateOnlyLocal(d) {
    const c = new Date(d);
    c.setMinutes(c.getMinutes() - c.getTimezoneOffset());
    return c.toISOString().slice(0, 10);
  }
  function firstDayOfYearLocal() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    return dateOnlyLocal(jan1);
  }

  // ----- cargar proveedores -----
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "proveedores"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.empresa || "").localeCompare(b.empresa || ""));
      setProveedores(list);
      if (!proveedorId && list.length) setProveedorId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- recalcular tabla con filtros -----
  useEffect(() => {
    cargarTabla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fDesde, fHasta, fTipo, fProv]);

  // ----- telas del proveedor (para select dinámico de Tela) -----
  const telasProveedor = useMemo(() => {
    const p = proveedores.find((x) => x.id === proveedorId);
    return Array.isArray(p?.telas)
      ? p.telas.filter((t) => (t?.codigo || "").trim())
      : [];
  }, [proveedores, proveedorId]);

  useEffect(() => {
    if (tipo === "Tela") setDetalle((s) => ({ ...s, codigo_tela: "" }));
  }, [proveedorId, tipo]);

  const onChangeDetalle = (k, v) => setDetalle((s) => ({ ...s, [k]: v }));
  const onSelectTelaProveedor = (e) =>
    setDetalle((s) => ({ ...s, codigo_tela: e.target.value }));

  // ======= Calcular y normalizar (reutilizable para single y batch) =======
  function buildPayload(_tipo, _proveedorId, _fechaHora, _detalle) {
    const fecha = new Date(_fechaHora);
    const ts = Timestamp.fromDate(fecha);

    let valor_total = 0;
    let valor_unitario = null;

    if (_tipo === "Tela") {
      const metros = parseFloat(_detalle.metros || 0); // acepta decimales
      valor_total = Number(_detalle.valor_total || 0);
      valor_unitario = metros ? Math.round(valor_total / metros) : null; // guardado redondeado (compatibilidad)
    } else if (_tipo === "Bordados") {
      const cantidad = Number(_detalle.cantidad || 0);
      const pu = Number(_detalle.precio_unitario || 0);
      valor_total = cantidad * pu;
      valor_unitario = pu;
    } else if (_tipo === "Mensajería") {
      valor_total = Number(_detalle.costo || 0);
    } else if (_tipo === "Almuerzos" || _tipo === "Otro") {
      valor_total = Number(_detalle.valor_total || 0);
    }

    const payload = {
      tipo: _tipo,
      proveedorId: _proveedorId,
      detalle: {
        codigo_tela: _detalle.codigo_tela || "",
        metros: _detalle.metros || "", // lo guardamos como se ingresó (texto, puede ser decimal)
        valor_total: valor_total,
        empresa_persona: _detalle.empresa_persona || "",
        costo: _detalle.costo || "",
        motivo: _detalle.motivo || "",
        bordadora: _detalle.bordadora || "",
        descripcion_bordado: _detalle.descripcion_bordado || "",
        colegio: _detalle.colegio || "",
        cantidad: _detalle.cantidad || "",
        precio_unitario: _detalle.precio_unitario || "",
        otros_detalle: _detalle.otros_detalle || "",
      },
      valor_total,
      valor_unitario,
      fechaHora: ts,
      createdAt: serverTimestamp(),
    };

    return { payload, valor_total, valor_unitario, fecha };
  }

  // ======= Guardar UNO (compatibilidad) =======
  async function guardarGasto(e) {
    e.preventDefault();
    if (!tipo || !proveedorId) return alert("Tipo y Proveedor son requeridos");

    const { payload } = buildPayload(tipo, proveedorId, fechaHora, detalle);

    setLoading(true);
    try {
      await addDoc(collection(db, "gastos"), payload);

      if (tipo === "Tela") {
        const metros = parseFloat(detalle.metros || 0);
        const unit = payload.valor_unitario ?? null;
        await addDoc(collection(db, "compras_telas"), {
          proveedorId,
          codigo_tela: detalle.codigo_tela || "",
          metros: isNaN(metros) ? 0 : metros,
          valor_unitario: unit,
          valor_total: payload.valor_total,
          fechaHora: payload.fechaHora,
          createdAt: serverTimestamp(),
        });
      }

      resetFormAfterSave();
      toastOK("Gasto agregado");
      cargarTabla();
    } catch (err) {
      console.error(err);
      alert("Error guardando el gasto");
    } finally {
      setLoading(false);
    }
  }

  // ======= Agregar a lista (no guarda) =======
  function agregarOtro() {
    try {
      if (!tipo || !proveedorId) return alert("Selecciona tipo y proveedor");
      if (tipo === "Tela" && (!detalle.metros || !detalle.valor_total)) {
        return alert("Completa Metros y Valor total");
      }
      if (tipo === "Mensajería" && !detalle.costo) {
        return alert("Completa Costo en Mensajería");
      }
      if (
        tipo === "Bordados" &&
        (!detalle.cantidad || !detalle.precio_unitario)
      ) {
        return alert("Completa Cantidad y Precio unitario");
      }

      // Clonar “limpio” (sin sentinels)
      const clonedDetalle = JSON.parse(JSON.stringify(detalle));
      const proveedorName =
        proveedores.find((p) => p.id === proveedorId)?.empresa || "—";

      setPendientes((arr) => [
        ...arr,
        {
          id: cryptoRandom(),
          tipo,
          proveedorId,
          proveedorName,
          fechaHora, // string
          detalle: clonedDetalle,
        },
      ]);

      // Reset para el siguiente
      setTipo("Tela");
      setDetalle({
        codigo_tela: "",
        metros: "",
        valor_total: "",
        empresa_persona: "",
        costo: "",
        motivo: "",
        bordadora: "",
        descripcion_bordado: "",
        colegio: "",
        cantidad: "",
        precio_unitario: "",
        otros_detalle: "",
      });
      setFechaHora(defaultLocalDT());
    } catch (err) {
      console.error("agregarOtro() error", err);
      alert("No se pudo agregar el gasto a la lista.");
    }
  }

  function quitarPendiente(id) {
    setPendientes((arr) => arr.filter((x) => x.id !== id));
  }

  // ======= Guardar TODO (lote) =======
  async function guardarTodo() {
    if (pendientes.length === 0) return alert("No hay gastos en la lista");
    setLoading(true);
    try {
      const batch = writeBatch(db);

      for (const item of pendientes) {
        const { payload } = buildPayload(
          item.tipo,
          item.proveedorId,
          item.fechaHora,
          item.detalle
        );
        // gastos
        const gRef = doc(collection(db, "gastos"));
        batch.set(gRef, payload);
        // compras_telas si aplica
        if (item.tipo === "Tela") {
          const metros = parseFloat(item.detalle.metros || 0);
          const unit = payload.valor_unitario ?? null;
          const cRef = doc(collection(db, "compras_telas"));
          batch.set(cRef, {
            proveedorId: item.proveedorId,
            codigo_tela: item.detalle.codigo_tela || "",
            metros: isNaN(metros) ? 0 : metros,
            valor_unitario: unit,
            valor_total: payload.valor_total,
            fechaHora: payload.fechaHora,
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
      setPendientes([]);
      toastOK("Gastos guardados en lote");
      cargarTabla();
    } catch (err) {
      console.error(err);
      alert("Error guardando en lote");
    } finally {
      setLoading(false);
    }
  }

  function resetFormAfterSave() {
    setTipo("Tela");
    setProveedorId(proveedorId);
    setFechaHora(defaultLocalDT());
    setDetalle({
      codigo_tela: "",
      metros: "",
      valor_total: "",
      empresa_persona: "",
      costo: "",
      motivo: "",
      bordadora: "",
      descripcion_bordado: "",
      colegio: "",
      cantidad: "",
      precio_unitario: "",
      otros_detalle: "",
    });
  }

  // ----- cargar tabla con filtros -----
  async function cargarTabla() {
    try {
      const start = Timestamp.fromDate(new Date(fDesde + "T00:00"));
      const end = Timestamp.fromDate(new Date(fHasta + "T23:59"));
      const qy = query(
        collection(db, "gastos"),
        where("fechaHora", ">=", start),
        where("fechaHora", "<=", end),
        orderBy("fechaHora", "desc")
      );
      const snap = await getDocs(qy);
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (fTipo) list = list.filter((r) => r.tipo === fTipo);
      if (fProv) list = list.filter((r) => r.proveedorId === fProv);
      setRows(list);
    } catch (err) {
      console.error(err);
      setRows([]);
    }
  }

  const provName = (id) => proveedores.find((p) => p.id === id)?.empresa || "—";
  const toastOK = (text) => console.log("✅", text);

  // ======= helpers de render =======
  function detallePretty(r) {
    const t = r.tipo;
    const d = r.detalle || {};
    if (t === "Tela") {
      const metros = d.metros || 0;
      const vu = r.valor_unitario ?? 0;
      return [
        "Tela",
        `Código: ${d.codigo_tela || "—"}`,
        `Metros: ${metros}`,
        `Valor/metro: $${Number(vu).toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Mensajería") {
      return [
        "Mensajería",
        `Empresa/Persona: ${d.empresa_persona || "—"}`,
        `Motivo: ${d.motivo || "—"}`,
        `Costo: $${Number(d.costo || 0).toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Bordados") {
      return [
        "Bordados",
        `Bordadora: ${d.bordadora || "—"}`,
        `Descripción: ${d.descripcion_bordado || "—"}`,
        `Colegio: ${d.colegio || "—"}`,
        `Cantidad: ${d.cantidad || 0}  •  PU: $${Number(
          r.valor_unitario || 0
        ).toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Almuerzos") {
      return ["Almuerzos", `Detalle: ${d.otros_detalle || "—"}`].join("\n");
    }
    return ["Otros", `Detalle: ${d.otros_detalle || "—"}`].join("\n");
  }

  // 👇 NUEVO: helper para la tabla de pendientes (evita crash)
  function pendientePretty(it) {
    const t = it.tipo;
    const d = it.detalle || {};
    if (t === "Tela") {
      const metros = parseFloat(d.metros || 0);
      const total = Number(d.valor_total || 0);
      const vu = metros ? Math.round(total / metros) : 0;
      return [
        "Tela",
        `Código: ${d.codigo_tela || "—"}`,
        `Metros: ${d.metros || 0}`,
        `Valor/metro: $${vu.toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Mensajería") {
      return [
        "Mensajería",
        `Empresa/Persona: ${d.empresa_persona || "—"}`,
        `Motivo: ${d.motivo || "—"}`,
        `Costo: $${Number(d.costo || 0).toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Bordados") {
      const cant = Number(d.cantidad || 0);
      const pu = Number(d.precio_unitario || 0);
      const total = cant * pu;
      return [
        "Bordados",
        `Bordadora: ${d.bordadora || "—"}`,
        `Descripción: ${d.descripcion_bordado || "—"}`,
        `Colegio: ${d.colegio || "—"}`,
        `Cantidad: ${cant}  •  PU: $${pu.toLocaleString("es-CO")}`,
        `Total: $${total.toLocaleString("es-CO")}`,
      ].join("\n");
    }
    if (t === "Almuerzos") {
      return ["Almuerzos", `Detalle: ${d.otros_detalle || "—"}`].join("\n");
    }
    return ["Otros", `Detalle: ${d.otros_detalle || "—"}`].join("\n");
  }

  function cryptoRandom() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ======= UI =======
  return (
    <div style={{ padding: 20, fontFamily: "Segoe UI, system-ui, sans-serif" }}>
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: UI.radius,
            background: UI.headerBg,
            display: "grid",
            placeItems: "center",
            fontSize: 18,
          }}
        >
          💸
        </div>
        <h2 style={{ margin: 0, color: "#1f2937" }}>Gastos</h2>
      </div>

      {/* Formulario (grid responsivo) */}
      <form onSubmit={guardarGasto} style={{ ...card, marginBottom: 16 }}>
        {/* fila 1: tipo / proveedor / fecha */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div>
            <label style={label}>Tipo de gasto</label>
            <select
              style={input}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Proveedor</label>
            <select
              style={input}
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.empresa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Fecha y hora</label>
            <input
              style={input}
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
            />
          </div>
        </div>

        {/* fila 2: campos dinámicos */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {tipo === "Tela" && (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={label}>Código de tela</label>
                {telasProveedor.length > 0 ? (
                  <>
                    <select
                      style={input}
                      value={detalle.codigo_tela}
                      onChange={onSelectTelaProveedor}
                    >
                      <option value="">Selecciona una tela…</option>
                      {telasProveedor.map((t, i) => (
                        <option key={t.codigo || i} value={t.codigo}>
                          {t.codigo} — {t.descripcion || "Sin descripción"}
                        </option>
                      ))}
                    </select>
                    <input
                      style={input}
                      placeholder="O escribe un código manual…"
                      value={detalle.codigo_tela}
                      onChange={(e) =>
                        onChangeDetalle("codigo_tela", e.target.value)
                      }
                    />
                  </>
                ) : (
                  <input
                    style={input}
                    placeholder="Código de tela"
                    value={detalle.codigo_tela}
                    onChange={(e) =>
                      onChangeDetalle("codigo_tela", e.target.value)
                    }
                  />
                )}
              </div>
              <div>
                <label style={label}>Metros</label>
                <input
                  style={input}
                  type="number"
                  step="0.01" // decimales
                  min="0"
                  value={detalle.metros}
                  onChange={(e) => onChangeDetalle("metros", e.target.value)}
                />
              </div>
              <div>
                <label style={label}>Valor total</label>
                <input
                  style={input}
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.valor_total}
                  onChange={(e) =>
                    onChangeDetalle("valor_total", e.target.value)
                  }
                />
              </div>
            </>
          )}

          {tipo === "Mensajería" && (
            <>
              <div>
                <label style={label}>Empresa / Persona</label>
                <input
                  style={input}
                  value={detalle.empresa_persona}
                  onChange={(e) =>
                    onChangeDetalle("empresa_persona", e.target.value)
                  }
                />
              </div>
              <div>
                <label style={label}>Costo</label>
                <input
                  style={input}
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.costo}
                  onChange={(e) => onChangeDetalle("costo", e.target.value)}
                />
              </div>
              <div>
                <label style={label}>Motivo</label>
                <input
                  style={input}
                  value={detalle.motivo}
                  onChange={(e) => onChangeDetalle("motivo", e.target.value)}
                />
              </div>
            </>
          )}

          {tipo === "Bordados" && (
            <>
              <div>
                <label style={label}>Bordadora</label>
                <input
                  style={input}
                  value={detalle.bordadora}
                  onChange={(e) => onChangeDetalle("bordadora", e.target.value)}
                />
              </div>
              <div>
                <label style={label}>Descripción</label>
                <input
                  style={input}
                  value={detalle.descripcion_bordado}
                  onChange={(e) =>
                    onChangeDetalle("descripcion_bordado", e.target.value)
                  }
                />
              </div>
              <div>
                <label style={label}>Colegio</label>
                <input
                  style={input}
                  value={detalle.colegio}
                  onChange={(e) => onChangeDetalle("colegio", e.target.value)}
                />
              </div>
              <div>
                <label style={label}>Cantidad</label>
                <input
                  style={input}
                  type="number"
                  min="0"
                  value={detalle.cantidad}
                  onChange={(e) => onChangeDetalle("cantidad", e.target.value)}
                />
              </div>
              <div>
                <label style={label}>Precio unitario</label>
                <input
                  style={input}
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.precio_unitario}
                  onChange={(e) =>
                    onChangeDetalle("precio_unitario", e.target.value)
                  }
                />
              </div>
            </>
          )}

          {(tipo === "Almuerzos" || tipo === "Otro") && (
            <>
              <div style={{ gridColumn: "span 2" }}>
                <label style={label}>Detalle</label>
                <input
                  style={input}
                  value={detalle.otros_detalle}
                  onChange={(e) =>
                    onChangeDetalle("otros_detalle", e.target.value)
                  }
                />
              </div>
              <div>
                <label style={label}>Valor total</label>
                <input
                  style={input}
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.valor_total}
                  onChange={(e) =>
                    onChangeDetalle("valor_total", e.target.value)
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Totales dinámicos */}
        <div style={{ marginTop: 12, color: "#1f2937" }}>
          {tipo === "Tela" &&
            (() => {
              const metros = parseFloat(detalle.metros || 0);
              const total = Number(detalle.valor_total || 0);
              const unitExact = metros ? total / metros : 0;
              return (
                <div>
                  <b>Valor/metro (exacto):</b>{" "}
                  {unitExact.toLocaleString("es-CO", {
                    maximumFractionDigits: 2,
                  })}
                  {"  "}
                  <span style={{ color: "#6b7280" }}>
                    (se guarda redondeado:{" "}
                    {metros ? Math.round(unitExact).toLocaleString("es-CO") : 0}
                    )
                  </span>
                </div>
              );
            })()}
          {tipo === "Bordados" &&
            (() => {
              const cant = Number(detalle.cantidad || 0);
              const pu = Number(detalle.precio_unitario || 0);
              const total = cant * pu;
              return (
                <div>
                  <b>Total:</b> {total.toLocaleString("es-CO")}
                </div>
              );
            })()}
        </div>

        {/* Acciones */}
        <div
          style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button type="button" onClick={agregarOtro} style={btn(UI.primary)}>
            + Agregar otro
          </button>
          <button
            type="button"
            onClick={guardarTodo}
            disabled={loading || pendientes.length === 0}
            style={btn(UI.green)}
          >
            Guardar todo ({pendientes.length})
          </button>
          <button
            type="submit"
            disabled={loading}
            style={btn("#9CA3AF", "#fff")}
          >
            Guardar uno
          </button>
        </div>
      </form>

      {/* Lista de pendientes */}
      {pendientes.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>
            Gastos por guardar ({pendientes.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: UI.headerBg }}>
                  <th style={{ padding: 10 }}>Fecha</th>
                  <th style={{ padding: 10 }}>Tipo</th>
                  <th style={{ padding: 10 }}>Proveedor</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Detalle</th>
                  <th style={{ padding: 10 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((it) => {
                  const d = new Date(it.fechaHora);
                  const fStr =
                    d.toLocaleDateString() +
                    " " +
                    d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  return (
                    <tr
                      key={it.id}
                      style={{ borderBottom: `1px solid ${UI.border}` }}
                    >
                      <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                        {fStr}
                      </td>
                      <td style={{ padding: 10, textAlign: "center" }}>
                        {it.tipo}
                      </td>
                      <td style={{ padding: 10 }}>{it.proveedorName}</td>
                      <td style={{ padding: 10, whiteSpace: "pre-line" }}>
                        {pendientePretty(it)}
                      </td>
                      <td style={{ padding: 10 }}>
                        <button
                          onClick={() => quitarPendiente(it.id)}
                          style={btn("#ef4444")}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de gastos (filtros con mejor gap) */}
      <div style={{ ...card }}>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            alignItems: "end",
            marginBottom: 10,
          }}
        >
          <div>
            <label style={label}>Desde</label>
            <input
              style={input}
              type="date"
              value={fDesde}
              onChange={(e) => setFDesde(e.target.value)}
            />
          </div>
          <div>
            <label style={label}>Hasta</label>
            <input
              style={input}
              type="date"
              value={fHasta}
              onChange={(e) => setFHasta(e.target.value)}
            />
          </div>
          <div>
            <label style={label}>Tipo</label>
            <select
              style={input}
              value={fTipo}
              onChange={(e) => setFTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Proveedor</label>
            <select
              style={input}
              value={fProv}
              onChange={(e) => setFProv(e.target.value)}
            >
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.empresa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button type="button" onClick={cargarTabla} style={btn(UI.primary)}>
              Aplicar
            </button>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontWeight: 800,
              color: UI.primary,
              alignSelf: "center",
            }}
          >
            Total:{" "}
            {rows
              .reduce((acc, r) => acc + Number(r.valor_total || 0), 0)
              .toLocaleString("es-CO")}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: UI.headerBg }}>
                <th style={{ padding: 10 }}>Fecha</th>
                <th style={{ padding: 10 }}>Tipo</th>
                <th style={{ padding: 10 }}>Proveedor</th>
                <th style={{ padding: 10, textAlign: "left" }}>Detalle</th>
                <th style={{ padding: 10 }}>Valor total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d =
                  r.fechaHora?.toDate?.() ||
                  (r.fechaHora?.seconds
                    ? new Date(r.fechaHora.seconds * 1000)
                    : new Date());
                const fStr =
                  d.toLocaleDateString() +
                  " " +
                  d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHoverRow(r.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    style={{
                      borderBottom: `1px solid ${UI.border}`,
                      background:
                        hoverRow === r.id ? "rgba(0,82,204,.06)" : "#fff",
                      transition: "background .12s ease",
                    }}
                  >
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                      {fStr}
                    </td>
                    <td style={{ padding: 10, textAlign: "center" }}>
                      {r.tipo}
                    </td>
                    <td style={{ padding: 10 }}>{provName(r.proveedorId)}</td>
                    <td style={{ padding: 10, whiteSpace: "pre-line" }}>
                      {detallePretty(r)}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        textAlign: "right",
                        color: UI.primary,
                        fontWeight: 800,
                      }}
                    >
                      {Number(r.valor_total || 0).toLocaleString("es-CO")}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: "#6b7280" }}>
                    Sin gastos en el rango.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
