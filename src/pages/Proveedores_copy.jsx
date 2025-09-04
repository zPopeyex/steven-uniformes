// src/pages/Proveedores.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { GENERAL_ORDER, sizeInRange } from "../utils/sizes";

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

const input = {
  height: 44,
  padding: "10px 12px",
  borderRadius: UI.radius,
  border: `1px solid ${UI.border}`,
  outline: "none",
  width: "100%",
};

const select = { ...input };

const label = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
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

export default function Proveedores() {
  const [form, setForm] = useState({
    empresa: "",
    telefono: "",
    nit: "",
    direccion: "",
  });
  const [telas, setTelas] = useState([{ codigo: "", descripcion: "" }]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [compras, setCompras] = useState([]);
  const [priceRules, setPriceRules] = useState([]);
  const [ruleForm, setRuleForm] = useState({ colegioId: "", productoId: "", tallaDesde: "", tallaHasta: "", precio: "", estado: "activo" });
  const [sortBy, setSortBy] = useState("fechaDesc");
  const [hoverRow, setHoverRow] = useState(null);

  const telasValidas = useMemo(
    () => telas.filter((t) => t.codigo.trim() || t.descripcion.trim()),
    [telas]
  );

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    const snap = await getDocs(collection(db, "proveedores"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.empresa || "").localeCompare(b.empresa || ""));
    setProveedores(list);
  }

  // Cargar compras SIN índice compuesto (ordenamos en memoria por fecha desc)
  async function cargarCompras(proveedorId) {
    if (!proveedorId) return setCompras([]);
    try {
      const q = query(
        collection(db, "compras_telas"),
        where("proveedorId", "==", proveedorId)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort(
        (a, b) => (b.fechaHora?.seconds || 0) - (a.fechaHora?.seconds || 0)
      );
      setCompras(rows);
    } catch (e) {
      console.error(e);
      setCompras([]);
    }
  }

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  const onChangeTela = (idx, field, value) =>
    setTelas((arr) => {
      const c = [...arr];
      c[idx] = { ...c[idx], [field]: value };
      return c;
    });
  const addTela = () =>
    setTelas((arr) => [...arr, { codigo: "", descripcion: "" }]);
  const delTela = (idx) => setTelas((arr) => arr.filter((_, i) => i !== idx));

  const resetForm = () => {
    setForm({ empresa: "", telefono: "", nit: "", direccion: "" });
    setTelas([{ codigo: "", descripcion: "" }]);
    setEditId(null);
  };

  const saveProveedor = async (e) => {
    e.preventDefault();
    if (!form.empresa.trim() || !form.telefono.trim()) {
      alert("Nombre de empresa y teléfono son requeridos");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        empresa: form.empresa.trim(),
        telefono: form.telefono.trim(),
        nit: form.nit?.trim() || "",
        direccion: form.direccion?.trim() || "",
        telas: telasValidas,
        updatedAt: serverTimestamp(),
        ...(editId ? {} : { createdAt: serverTimestamp() }),
      };
      if (editId) {
        await updateDoc(doc(db, "proveedores", editId), payload);
      } else {
        await addDoc(collection(db, "proveedores"), payload);
      }
      await cargarProveedores();
      resetForm();
      toastOK(editId ? "Proveedor actualizado" : "Proveedor registrado");
    } catch (e) {
      console.error(e);
      alert("Error guardando proveedor");
    } finally {
      setLoading(false);
    }
  };

  const editarProv = (p) => {
    setEditId(p.id);
    setForm({
      empresa: p.empresa || "",
      telefono: p.telefono || "",
      nit: p.nit || "",
      direccion: p.direccion || "",
    });
    setTelas(
      Array.isArray(p.telas) && p.telas.length
        ? p.telas
        : [{ codigo: "", descripcion: "" }]
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarProv = async (id) => {
    if (!confirm("¿Eliminar proveedor? Esto no borra el histórico de compras."))
      return;
    await deleteDoc(doc(db, "proveedores", id));
    await cargarProveedores();
    if (detalleId === id) {
      setDetalleId(null);
      setCompras([]);
    }
    toastOK("Proveedor eliminado");
  };

  const verDetalle = async (id) => {
    setDetalleId(id);
    await cargarCompras(id);
    await cargarReglas(id);
  };

  const toastOK = (text) => console.log("✅", text);

  const comprasOrdenadas = useMemo(() => {
    const rows = [...compras];
    if (sortBy === "fechaAsc")
      rows.sort(
        (a, b) => (a.fechaHora?.seconds || 0) - (b.fechaHora?.seconds || 0)
      );
    if (sortBy === "fechaDesc")
      rows.sort(
        (a, b) => (b.fechaHora?.seconds || 0) - (a.fechaHora?.seconds || 0)
      );
    if (sortBy === "codigo")
      rows.sort((a, b) =>
        (a.codigo_tela || "").localeCompare(b.codigo_tela || "")
      );
    return rows;
  }, [compras, sortBy]);

  async function cargarReglas(proveedorId) {
    if (!proveedorId) return setPriceRules([]);
    const snap = await getDocs(collection(db, "proveedores", proveedorId, "priceRules"));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPriceRules(rows);
  }

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
            borderRadius: 12,
            background: UI.headerBg,
            display: "grid",
            placeItems: "center",
            fontSize: 18,
          }}
        >
          🏢
        </div>
        <h2 style={{ margin: 0, color: "#1f2937" }}>Proveedores</h2>
      </div>

      {/* Formulario */}
      <form onSubmit={saveProveedor} style={{ ...card, marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div>
            <label style={label}>Nombre de empresa *</label>
            <input
              style={input}
              name="empresa"
              value={form.empresa}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label style={label}>Teléfono *</label>
            <input
              style={input}
              name="telefono"
              value={form.telefono}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label style={label}>NIT (opcional)</label>
            <input
              style={input}
              name="nit"
              value={form.nit}
              onChange={onChange}
            />
          </div>
          <div>
            <label style={label}>Dirección</label>
            <input
              style={input}
              name="direccion"
              value={form.direccion}
              onChange={onChange}
            />
          </div>
        </div>

        {/* Telas */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#1f2937" }}>
            Telas que vende
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {telas.map((t, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "1fr 2fr auto",
                  alignItems: "center",
                }}
              >
                <input
                  style={input}
                  placeholder="Código interno"
                  value={t.codigo}
                  onChange={(e) => onChangeTela(idx, "codigo", e.target.value)}
                />
                <input
                  style={input}
                  placeholder="Descripción"
                  value={t.descripcion}
                  onChange={(e) =>
                    onChangeTela(idx, "descripcion", e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => delTela(idx)}
                  style={btn("#ef4444")}
                >
                  Eliminar
                </button>
              </div>
            ))}
            <div>
              <button type="button" onClick={addTela} style={btn(UI.green)}>
                + Agregar tela
              </button>
            </div>
          </div>
        </div>

        <div
          style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button type="submit" disabled={loading} style={btn(UI.primary)}>
            {editId ? "Actualizar proveedor" : "Registrar proveedor"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              style={btn("#9CA3AF", "#fff")}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Listado de proveedores */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 800, color: "#1f2937" }}>
            Listado de proveedores
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: UI.headerBg }}>
                {["Empresa", "Teléfono", "NIT", "Dirección", "Acciones"].map(
                  (h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: 10,
                        textAlign: i === 4 ? "center" : "left",
                        color: "#1f3b6c",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr
                  key={p.id}
                  onMouseEnter={() => setHoverRow(p.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  style={{
                    borderBottom: `1px solid ${UI.border}`,
                    background:
                      hoverRow === p.id ? "rgba(0,82,204,.06)" : "#fff",
                    transition: "background .12s ease",
                  }}
                >
                  <td style={{ padding: 10, fontWeight: 600 }}>{p.empresa}</td>
                  <td style={{ padding: 10 }}>{p.telefono}</td>
                  <td style={{ padding: 10 }}>{p.nit}</td>
                  <td style={{ padding: 10 }}>{p.direccion}</td>
                  <td style={{ padding: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => editarProv(p)}
                        style={btn("#FFC107", "#000")}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarProv(p.id)}
                        style={btn("#ef4444")}
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => verDetalle(p.id)}
                        style={btn(UI.primary)}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 14, color: "#6b7280" }}>
                    Sin proveedores aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de compras */}
      {detalleId && (
        <div style={{ ...card }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              Histórico de compras
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ ...select, height: 38, width: 220 }}
            >
              <option value="fechaDesc">Ordenar: Fecha ↓</option>
              <option value="fechaAsc">Ordenar: Fecha ↑</option>
              <option value="codigo">Ordenar: Código de tela</option>
            </select>
            <button
              type="button"
              onClick={() => cargarCompras(detalleId)}
              style={btn(UI.green)}
            >
              ↻ Actualizar
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: UI.headerBg }}>
                  {[
                    "Código de tela",
                    "Metros",
                    "Vr. Unitario",
                    "Vr. Total",
                    "Fecha",
                    "Hora",
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: 10,
                        textAlign: [
                          "Metros",
                          "Vr. Unitario",
                          "Vr. Total",
                        ].includes(h)
                          ? "right"
                          : "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comprasOrdenadas.map((c) => {
                  const fecha =
                    c.fechaHora?.toDate?.() ||
                    (c.fechaHora?.seconds
                      ? new Date(c.fechaHora.seconds * 1000)
                      : null);
                  const fStr = fecha ? fecha.toLocaleDateString() : "-";
                  const hStr = fecha
                    ? fecha.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: `1px solid ${UI.border}` }}
                    >
                      <td style={{ padding: 10, fontWeight: 600 }}>
                        {c.codigo_tela}
                      </td>
                      <td style={{ padding: 10, textAlign: "right" }}>
                        {Number(c.metros || 0)}
                      </td>
                      <td style={{ padding: 10, textAlign: "right" }}>
                        {Number(c.valor_unitario || 0).toLocaleString("es-CO")}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          textAlign: "right",
                          color: UI.primary,
                          fontWeight: 800,
                        }}
                      >
                        {Number(c.valor_total || 0).toLocaleString("es-CO")}
                      </td>
                      <td style={{ padding: 10 }}>{fStr}</td>
                      <td style={{ padding: 10 }}>{hStr}</td>
                    </tr>
                  );
                })}
                {comprasOrdenadas.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 14, color: "#6b7280" }}>
                      Sin compras registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prendas (rangos) */}
      {detalleId && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: "#1f2937" }}>Prendas (rangos)</h3>
            <button type="button" onClick={() => cargarReglas(detalleId)} style={btn(UI.green)}>Actualizar</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={label}>Colegio</label>
              <input style={input} value={ruleForm.colegioId} onChange={(e) => setRuleForm({ ...ruleForm, colegioId: e.target.value })} placeholder="Colegio" />
            </div>
            <div>
              <label style={label}>Producto</label>
              <input style={input} value={ruleForm.productoId} onChange={(e) => setRuleForm({ ...ruleForm, productoId: e.target.value })} placeholder="Producto" />
            </div>
            <div>
              <label style={label}>Talla desde</label>
              <select style={select} value={ruleForm.tallaDesde} onChange={(e) => setRuleForm({ ...ruleForm, tallaDesde: e.target.value })}>
                <option value="">-</option>
                {GENERAL_ORDER.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Talla hasta</label>
              <select style={select} value={ruleForm.tallaHasta} onChange={(e) => setRuleForm({ ...ruleForm, tallaHasta: e.target.value })}>
                <option value="">-</option>
                {GENERAL_ORDER.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Precio unidad</label>
              <input type="number" style={input} value={ruleForm.precio} onChange={(e) => setRuleForm({ ...ruleForm, precio: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label style={label}>Estado</label>
              <select style={select} value={ruleForm.estado} onChange={(e) => setRuleForm({ ...ruleForm, estado: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              style={btn(UI.green)}
              onClick={async () => {
                if (!detalleId) return;
                const { colegioId, productoId, tallaDesde, tallaHasta, precio, estado } = ruleForm;
                if (!colegioId || !productoId || !tallaDesde || !tallaHasta || !precio) {
                  alert("Completa todos los campos de la regla");
                  return;
                }
                const overlap = priceRules.some((r) => (r.colegioId || r.colegio) === colegioId && (r.productoId || r.prenda || r.producto) === productoId && (sizeInRange(tallaDesde, r.tallaDesde, r.tallaHasta) || sizeInRange(tallaHasta, r.tallaDesde, r.tallaHasta)));
                if (overlap && !confirm("Ya existe una regla que solapa este rango. ¿Continuar?")) return;
                await addDoc(collection(db, "proveedores", detalleId, "priceRules"), {
                  colegioId,
                  productoId,
                  tallaDesde,
                  tallaHasta,
                  precio: Number(precio),
                  estado,
                  creadoEn: serverTimestamp(),
                });
                setRuleForm({ colegioId: "", productoId: "", tallaDesde: "", tallaHasta: "", precio: "", estado: "activo" });
                cargarReglas(detalleId);
              }}
            >
              Guardar regla
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: UI.headerBg }}>
                  {["Colegio", "Producto", "Desde", "Hasta", "Precio", "Estado", "Acciones"].map((h, i) => (
                    <th key={i} style={{ padding: 10, textAlign: "left", color: "#1f3b6c" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceRules.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${UI.border}` }}>
                    <td style={{ padding: 10 }}>{r.colegioId || r.colegio || ""}</td>
                    <td style={{ padding: 10 }}>{r.productoId || r.prenda || r.producto || ""}</td>
                    <td style={{ padding: 10 }}>{r.tallaDesde}</td>
                    <td style={{ padding: 10 }}>{r.tallaHasta}</td>
                    <td style={{ padding: 10 }}>{Number(r.precio || 0).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>{r.estado || "activo"}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={btn("#FFC107", "#000")} onClick={async () => {
                          const nuevo = prompt("Nuevo precio unitario:", String(r.precio || 0));
                          if (nuevo == null) return;
                          await updateDoc(doc(db, "proveedores", detalleId, "priceRules", r.id), { precio: Number(nuevo) });
                          cargarReglas(detalleId);
                        }}>Editar</button>
                        <button style={btn("#ef4444")} onClick={async () => {
                          if (!confirm("¿Eliminar regla?")) return;
                          await deleteDoc(doc(db, "proveedores", detalleId, "priceRules", r.id));
                          cargarReglas(detalleId);
                        }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {priceRules.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 14, color: "#6b7280" }}>Sin reglas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
