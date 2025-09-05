// src/pages/Gastos.jsx - Modern UI/UX Refactored Version
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

// Import new components
import { ExpenseKPIRow, TotalExpenseKPI, ExpenseCountKPI, AverageExpenseKPI } from '../components/gastos/ExpenseKPI';
import SupplierBadge from '../components/gastos/SupplierBadge';
import ExpenseTypeBadge from '../components/gastos/ExpenseTypeBadge';
import CurrencyCell, { CurrencyTotal } from '../components/gastos/CurrencyCell';
import { TableEmptyState } from '../components/gastos/EmptyState';
import { formatDateTime, formatExpenseDetail, calculateExpenseKPIs } from '../utils/format';

// Import new styles
import '../styles/gastos.css';

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
  // eslint-disable-next-line no-unused-vars
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

      // Clonar "limpio" (sin sentinels)
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

  // eslint-disable-next-line no-unused-vars
  const provName = (id) => proveedores.find((p) => p.id === id)?.empresa || "—";
  const getProveedor = (id) => proveedores.find((p) => p.id === id) || null;
  const toastOK = (text) => {
    console.log("✅", text);
    // TODO: Replace with actual toast notification system
  };
  
  // Calculate KPIs from current filtered rows
  const kpis = useMemo(() => calculateExpenseKPIs(rows), [rows]);
  
  // Clear all filters
  const clearFilters = () => {
    setFDesde(firstDayOfYearLocal());
    setFHasta(dateOnlyLocal(new Date()));
    setFTipo("");
    setFProv("");
  };

  // ======= helpers de render =======
  // Busca descripción de tela por proveedor + código (para mostrar en tablas)
  const lookupTelaDescripcion = (provId, codigo) => {
    try {
      const p = proveedores.find((pp) => pp.id === provId);
      const arr = Array.isArray(p?.telas) ? p.telas : [];
      const code = String(codigo || "").trim();
      const t = arr.find((tt) => String(tt?.codigo || "").trim() === code);
      return t?.descripcion || t?.nombre || t?.desc || t?.detalle || null;
    } catch {
      return null;
    }
  };

  function detallePrettyV2(r) {
    return formatExpenseDetail(r, proveedores);
  }

  function pendientePrettyV2(it) {
    const t = it.tipo;
    const d = it.detalle || {};
    if (t === "Tela") {
      const metros = parseFloat(d.metros || 0);
      const total = Number(d.valor_total || 0);
      const vu = metros ? Math.round(total / metros) : 0;
      const nombreTela = lookupTelaDescripcion(it.proveedorId, d.codigo_tela);
      return [
        `Tela: ${nombreTela || d.codigo_tela || "—"}`,
        `Metros: ${d.metros || 0}`,
        `Valor/metro: $${vu.toLocaleString("es-CO")}`,
      ].join("\n");
    }
    // Use existing logic for other types
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
    <div className="gastos-container">
      {/* Header with KPIs */}
      <div className="gastos-header">
        <div className="gastos-title-section">
          <div className="gastos-icon">💸</div>
          <h1 className="gastos-title">Gastos</h1>
        </div>
        
        {/* KPI Row */}
        <ExpenseKPIRow loading={loading}>
          <TotalExpenseKPI value={kpis.total} loading={loading} />
          <ExpenseCountKPI value={kpis.count} loading={loading} />
          <AverageExpenseKPI value={kpis.average} loading={loading} />
        </ExpenseKPIRow>
      </div>

      {/* Modern Form */}
      <form onSubmit={guardarGasto} className="gastos-form-card">
        {/* Main form fields */}
        <div className="gastos-form-grid gastos-form-grid--main">
          <div className="gastos-form-group">
            <label className="gastos-label">Tipo de gasto</label>
            <select
              className="gastos-select"
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
          <div className="gastos-form-group">
            <label className="gastos-label">Proveedor</label>
            <select
              className="gastos-select"
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
          <div className="gastos-form-group">
            <label className="gastos-label">Fecha y hora</label>
            <input
              className="gastos-input"
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic detail fields */}
        <div className="gastos-form-grid gastos-form-grid--details">
          {tipo === "Tela" && (
            <>
              <div className="gastos-form-group">
                <label className="gastos-label">Código de tela</label>
                {telasProveedor.length > 0 ? (
                  <>
                    <select
                      className="gastos-select"
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
                      className="gastos-input"
                      placeholder="O escribe un código manual…"
                      value={detalle.codigo_tela}
                      onChange={(e) =>
                        onChangeDetalle("codigo_tela", e.target.value)
                      }
                    />
                  </>
                ) : (
                  <input
                    className="gastos-input"
                    placeholder="Código de tela"
                    value={detalle.codigo_tela}
                    onChange={(e) =>
                      onChangeDetalle("codigo_tela", e.target.value)
                    }
                  />
                )}
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Metros</label>
                <input
                  className="gastos-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.metros}
                  onChange={(e) => onChangeDetalle("metros", e.target.value)}
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Valor total</label>
                <input
                  className="gastos-input"
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
              <div className="gastos-form-group">
                <label className="gastos-label">Empresa / Persona</label>
                <input
                  className="gastos-input"
                  value={detalle.empresa_persona}
                  onChange={(e) =>
                    onChangeDetalle("empresa_persona", e.target.value)
                  }
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Costo</label>
                <input
                  className="gastos-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalle.costo}
                  onChange={(e) => onChangeDetalle("costo", e.target.value)}
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Motivo</label>
                <input
                  className="gastos-input"
                  value={detalle.motivo}
                  onChange={(e) => onChangeDetalle("motivo", e.target.value)}
                />
              </div>
            </>
          )}

          {tipo === "Bordados" && (
            <>
              <div className="gastos-form-group">
                <label className="gastos-label">Bordadora</label>
                <input
                  className="gastos-input"
                  value={detalle.bordadora}
                  onChange={(e) => onChangeDetalle("bordadora", e.target.value)}
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Descripción</label>
                <input
                  className="gastos-input"
                  value={detalle.descripcion_bordado}
                  onChange={(e) =>
                    onChangeDetalle("descripcion_bordado", e.target.value)
                  }
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Colegio</label>
                <input
                  className="gastos-input"
                  value={detalle.colegio}
                  onChange={(e) => onChangeDetalle("colegio", e.target.value)}
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Cantidad</label>
                <input
                  className="gastos-input"
                  type="number"
                  min="0"
                  value={detalle.cantidad}
                  onChange={(e) => onChangeDetalle("cantidad", e.target.value)}
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Precio unitario</label>
                <input
                  className="gastos-input"
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
              <div className="gastos-form-group" style={{ gridColumn: "span 2" }}>
                <label className="gastos-label">Detalle</label>
                <input
                  className="gastos-input"
                  value={detalle.otros_detalle}
                  onChange={(e) =>
                    onChangeDetalle("otros_detalle", e.target.value)
                  }
                />
              </div>
              <div className="gastos-form-group">
                <label className="gastos-label">Valor total</label>
                <input
                  className="gastos-input"
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

        {/* Dynamic calculations display */}
        {tipo === "Tela" && (() => {
          const metros = parseFloat(detalle.metros || 0);
          const total = Number(detalle.valor_total || 0);
          const unitExact = metros ? total / metros : 0;
          return (
            <div className="gastos-calculation">
              <strong>Valor/metro (exacto):</strong>{" "}
              {unitExact.toLocaleString("es-CO", {
                maximumFractionDigits: 2,
              })}
              {"  "}
              <span className="muted">
                (se guarda redondeado:{" "}
                {metros ? Math.round(unitExact).toLocaleString("es-CO") : 0}
                )
              </span>
            </div>
          );
        })()}
        
        {tipo === "Bordados" && (() => {
          const cant = Number(detalle.cantidad || 0);
          const pu = Number(detalle.precio_unitario || 0);
          const total = cant * pu;
          return (
            <div className="gastos-calculation">
              <strong>Total:</strong> {total.toLocaleString("es-CO")}
            </div>
          );
        })()}

        {/* Action buttons */}
        <div className="gastos-actions">
          <button 
            type="button" 
            onClick={agregarOtro} 
            className="gastos-btn gastos-btn--primary"
            disabled={loading}
          >
            + Agregar otro
          </button>
          <button
            type="button"
            onClick={guardarTodo}
            disabled={loading || pendientes.length === 0}
            className="gastos-btn gastos-btn--green"
          >
            Guardar todo ({pendientes.length})
          </button>
          <button
            type="submit"
            disabled={loading}
            className="gastos-btn gastos-btn--secondary"
          >
            Guardar uno
          </button>
        </div>
      </form>

      {/* Lista de pendientes */}
      {pendientes.length > 0 && (
        <div className="gastos-pending-card">
          <div className="gastos-pending-title">
            Gastos por guardar
            <span className="gastos-pending-count">{pendientes.length}</span>
          </div>
          <div className="gastos-table-wrapper">
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Proveedor</th>
                  <th style={{ textAlign: "left" }}>Detalle</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((it) => {
                  const d = new Date(it.fechaHora);
                  const fStr = formatDateTime(d);
                  return (
                    <tr key={it.id}>
                      <td className="gastos-table-date">{fStr}</td>
                      <td style={{ textAlign: "center" }}>
                        <ExpenseTypeBadge type={it.tipo} size="sm" />
                      </td>
                      <td>
                        <SupplierBadge 
                          supplier={getProveedor(it.proveedorId)} 
                          compact={true} 
                        />
                      </td>
                      <td className="gastos-table-detail">
                        {pendientePrettyV2(it)}
                      </td>
                      <td>
                        <button
                          onClick={() => quitarPendiente(it.id)}
                          className="gastos-btn gastos-btn--secondary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
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

      {/* Modern Table Card */}
      <div className="gastos-table-card">
        {/* Sticky Filters Bar */}
        <div className="gastos-filters-bar">
          <div className="gastos-filters-grid">
            <div className="gastos-form-group">
              <label className="gastos-label">Desde</label>
              <input
                className="gastos-input"
                type="date"
                value={fDesde}
                onChange={(e) => setFDesde(e.target.value)}
              />
            </div>
            <div className="gastos-form-group">
              <label className="gastos-label">Hasta</label>
              <input
                className="gastos-input"
                type="date"
                value={fHasta}
                onChange={(e) => setFHasta(e.target.value)}
              />
            </div>
            <div className="gastos-form-group">
              <label className="gastos-label">Tipo</label>
              <select
                className="gastos-select"
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
            <div className="gastos-form-group">
              <label className="gastos-label">Proveedor</label>
              <select
                className="gastos-select"
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
            <div className="gastos-form-group">
              <button 
                type="button" 
                onClick={cargarTabla} 
                className="gastos-btn gastos-btn--primary"
                disabled={loading}
              >
                Aplicar
              </button>
            </div>
          </div>
          <div className="gastos-filters-total">
            <CurrencyCell
              value={rows.reduce((acc, r) => acc + Number(r.valor_total || 0), 0)}
              size="lg"
              color="primary"
              align="right"
            />
          </div>
        </div>

        {/* Table */}
        <div className="gastos-table-wrapper">
          <table className="gastos-table">
            <thead className="gastos-table-header">
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Proveedor</th>
                <th style={{ textAlign: "left" }}>Detalle</th>
                <th>Valor total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((r) => {
                const d = r.fechaHora?.toDate?.() ||
                  (r.fechaHora?.seconds
                    ? new Date(r.fechaHora.seconds * 1000)
                    : new Date());
                const fStr = formatDateTime(d);
                
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHoverRow(r.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    <td className="gastos-table-date">{fStr}</td>
                    <td style={{ textAlign: "center" }}>
                      <ExpenseTypeBadge type={r.tipo} size="sm" />
                    </td>
                    <td>
                      <SupplierBadge 
                        supplier={getProveedor(r.proveedorId)}
                        showTooltip={true}
                      />
                    </td>
                    <td className="gastos-table-detail">
                      {detallePrettyV2(r)}
                    </td>
                    <td className="gastos-table-amount">
                      <CurrencyCell
                        value={r.valor_total}
                        size="default"
                        color="primary"
                        align="right"
                      />
                    </td>
                  </tr>
                );
              }) : (
                <TableEmptyState
                  colSpan={5}
                  type={fTipo || fProv || (fDesde !== firstDayOfYearLocal()) ? "no-results" : "no-data"}
                  onAction={clearFilters}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}