import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  getDoc,
  runTransaction,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import VentasForm from "../components/VentasForm";
import VentasTable from "../components/VentasTable";
import EncargosTable from "../components/EncargosTable";
import Escaner from "../components/Escaner";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/modern-ui.css";
// ⬇️ ADD: imports de UI moderna
// import VentasFormModern from "../components/modern/VentasFormModern"; // reexportado por components/VentasForm
import VentasTableModern from "../components/VentasTable.modern";
import EncargosTableModern from "../components/EncargosTable.modern"; // reexport desde modern

const VentasEncargos = () => {
  const [ventas, setVentas] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoEscaneado, setProductoEscaneado] = useState(null);
  const [tabActiva, setTabActiva] = useState("ventas");
  const [totalVentas, setTotalVentas] = useState(0);
  const { role } = useAuth();
  // ⬇️ ADD: feature flag (puedes apagarla si algo no te gusta)
  const USE_MODERN_UI = true;

  // Cargar ventas iniciales (histórico)
  const cargarDatos = async () => {
    try {
      const ventasSnap = await getDocs(
        query(collection(db, "ventas"), orderBy("fechaHora", "desc"))
      );
      setVentas(ventasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("Error cargando datos. Por favor recarga la página.");
    }
  };
  useEffect(() => {
    cargarDatos();
  }, []);
  useEffect(() => {
    setTotalVentas(ventas.reduce((sum, v) => sum + v.precio * v.cantidad, 0));
  }, [ventas]);

  // Escáner
  const handleQRDetectado = (codigo) => {
    const [colegio, prenda, talla, precio] = codigo.split("-");
    if (colegio && prenda && talla && precio) {
      setProductoEscaneado({ colegio, prenda, talla, precio });
      setMostrarEscaner(false);
    }
  };

  // Encargos en vivo (compat viejo/nuevo)
  const [encargosResumen, setEncargosResumen] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "encargos"), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const ta =
          (a.createdAt?.seconds || 0) * 1000 || (a.fecha?.seconds || 0) * 1000;
        const tb =
          (b.createdAt?.seconds || 0) * 1000 || (b.fecha?.seconds || 0) * 1000;
        return tb - ta;
      });
      setEncargosResumen(rows);
    });
    return () => unsub();
  }, []);

  // ====== VENTAS ======
  const handleAgregarVenta = async (itemsCarrito) => {
    try {
      const items = Array.isArray(itemsCarrito) ? itemsCarrito : [itemsCarrito];

      const invalidos = items.filter(
        (it) =>
          !it.colegio?.trim() ||
          !it.prenda?.trim() ||
          !it.talla?.trim() ||
          isNaN(it.precio) ||
          it.precio <= 0 ||
          isNaN(it.cantidad) ||
          it.cantidad <= 0
      );
      if (invalidos.length > 0) {
        throw new Error(`${invalidos.length} producto(s) inválidos`);
      }

      const numeroFactura = `FAC-${Date.now()}`;
      const fechaHora = serverTimestamp();
      const batch = items.map((it) => ({
        ...it,
        numeroFactura,
        fechaHora,
        abono: it.estado === "separado" ? Number(it.abono) || 0 : 0,
        saldo: it.estado === "separado" ? Number(it.saldo) || 0 : 0,
        cliente: it.cliente || "",
        precio: Number(it.precio),
        cantidad: Number(it.cantidad),
      }));

      await Promise.all(
        batch.map((it) => addDoc(collection(db, "ventas"), it))
      );

      const ventasNormales = items.filter((it) => it.estado === "venta");
      if (ventasNormales.length > 0) await actualizarStock(ventasNormales);

      cargarDatos();
      return true;
    } catch (e) {
      console.error("Error al registrar venta:", e);
      alert(`Error al registrar venta: ${e.message}`);
      return false;
    }
  };

  // Consecutivo corto para Ventas
  const guardarVentaConConsecutivo = async (items, onAgregar) => {
    const r = await runTransaction(db, async (tx) => {
      const ref = doc(db, "parametros", "facturacionVentas");
      const snap = await tx.get(ref);
      const current = snap.exists() ? Number(snap.data().siguiente) || 1 : 1;
      const next = current + 1;
      tx.set(
        ref,
        {
          siguiente: next,
          longitud: 4,
          actualizadoEn: new Date().toISOString(),
        },
        { merge: true }
      );
      return current;
    });
    const numeroCorto = String(r).padStart(4, "0");
    const conNumero = (Array.isArray(items) ? items : [items]).map((it) => ({
      ...it,
      numeroCorto,
      numeroPrevio: it.numeroFactura || null,
    }));
    return onAgregar(conNumero);
  };

  // ====== ENCARGOS ======
  async function getNextEncargoCode() {
    const ref = doc(db, "counters", "encargos");
    const { code, seq } = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const prefix = snap.exists() ? snap.data().prefix || "ENC-" : "ENC-";
      const pad = snap.exists() ? snap.data().pad || 4 : 4;
      let next = 1;
      if (!snap.exists()) {
        tx.set(ref, { next: 1, prefix, pad, updatedAt: serverTimestamp() });
      } else {
        next = (snap.data().next || 0) + 1;
        tx.update(ref, { next, updatedAt: serverTimestamp() });
      }
      const code = `${prefix}${String(next).padStart(pad, "0")}`;
      return { code, seq: next };
    });
    return { codigoCorto: code, seq, year: new Date().getFullYear() };
  }

  function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((p) => {
      const cantidad = Number(p.cantidad || 0);
      const unit = Number(p.vrUnitario ?? p.precio ?? 0);
      return {
        producto: p.producto ?? p.prenda ?? "",
        plantel: p.plantel ?? p.colegio ?? "",
        talla: p.talla ?? "",
        cantidad,
        vrUnitario: unit,
        vrTotal: Number(p.vrTotal ?? p.total ?? cantidad * unit),
        entregado: !!p.entregado,
      };
    });
  }

  const handleAgregarEncargo = async (encargo) => {
    try {
      const clienteResumen = encargo.clienteResumen || encargo.cliente || null;
      const clienteId = encargo.clienteId || null;

      const items = normalizeItems(encargo.items || encargo.productos || []);
      if (!items.length) throw new Error("Faltan productos para el encargo");

      const total =
        Number(encargo.total) ||
        items.reduce((s, i) => s + (Number(i.vrTotal) || 0), 0);
      const abono = Number(encargo.abono || 0);
      const saldo =
        encargo.saldo !== undefined
          ? Number(encargo.saldo)
          : Math.max(total - abono, 0);

      const { codigoCorto, seq, year } = await getNextEncargoCode();

      const payload = {
        codigoCorto,
        secuencia: seq,
        anio: year,
        clienteId,
        clienteResumen,
        items,
        total,
        abono,
        saldo,
        estado: encargo.estado || "pendiente",
        metodoPago: encargo.metodoPago || encargo.formaPago || "efectivo",
        observaciones: encargo.observaciones || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        numeroFactura: codigoCorto, // compat
      };

      await addDoc(collection(db, "encargos"), payload);
      return true;
    } catch (e) {
      console.error("Error al registrar encargo:", e);
      alert(`Error al registrar encargo: ${e.message}`);
      return false;
    }
  };

  const actualizarStock = async (items) => {
    const updates = items.map(async (item) => {
      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", item.colegio),
        where("prenda", "==", item.prenda),
        where("talla", "==", item.talla)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        await updateDoc(stockDoc.ref, {
          cantidad: stockDoc.data().cantidad - item.cantidad,
        });
      }
    });
    await Promise.all(updates);
  };

  const handleActualizarEstado = async (id, nuevoEstado, coleccion) => {
    try {
      const docRef = doc(db, coleccion, id);
      await updateDoc(docRef, { estado: nuevoEstado });

      if (nuevoEstado === "venta" && coleccion === "ventas") {
        const ventaDoc = await getDoc(docRef);
        if (ventaDoc.exists()) await actualizarStock([ventaDoc.data()]);
      }
      // refresco simple
      if (coleccion === "ventas") cargarDatos();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  return (
    <div className="sales-card">
      <header className="card-header">
        <h2 className="card-title">
          <i className="fa-solid fa-receipt icon" /> Gestión de Ventas y
          Encargos
        </h2>
        <button
          onClick={() => setMostrarEscaner(!mostrarEscaner)}
          className="btn-qr"
          aria-label={
            mostrarEscaner ? "Cerrar escáner" : "Escanear código de barras"
          }
        >
          <i className="fa-solid fa-qrcode" />
          {mostrarEscaner ? " Cerrar" : " Escanear código de barras"}
        </button>
      </header>

      {mostrarEscaner && <Escaner onScan={handleQRDetectado} />}

      <div className="sales-toggle" role="tablist">
        <button
          className={`tab-btn ${tabActiva === "ventas" ? "active" : ""}`}
          role="tab"
          aria-selected={tabActiva === "ventas"}
          onClick={() => setTabActiva("ventas")}
        >
          Ventas
        </button>
        <button
          className={`tab-btn ${tabActiva === "encargos" ? "active" : ""}`}
          role="tab"
          aria-selected={tabActiva === "encargos"}
          onClick={() => setTabActiva("encargos")}
        >
          Encargos
        </button>
      </div>

      {/* TAB VENTAS */}
      <div id="ventas-tab" role="tabpanel" hidden={tabActiva !== "ventas"}>
        {USE_MODERN_UI ? (
          <VentasForm
            productoEscaneado={productoEscaneado}
            onAgregar={(items) =>
              guardarVentaConConsecutivo(items, handleAgregarVenta)
            }
            onAgregarEncargo={handleAgregarEncargo}
          />
        ) : (
          <VentasForm
            productoEscaneado={productoEscaneado}
            onAgregar={(items) =>
              guardarVentaConConsecutivo(items, handleAgregarVenta)
            }
            onAgregarEncargo={handleAgregarEncargo}
          />
        )}

        {USE_MODERN_UI ? (
          <VentasTableModern
            ventas={ventas}
            totalVentas={totalVentas}
            onActualizarEstado={(id, estado) =>
              handleActualizarEstado(id, estado, "ventas")
            }
            role={role}
          />
        ) : (
          <VentasTable
            ventas={ventas}
            totalVentas={totalVentas}
            onActualizarEstado={(id, estado) =>
              handleActualizarEstado(id, estado, "ventas")
            }
            role={role}
          />
        )}
      </div>

      {/* TAB ENCARGOS */}
      <div id="encargos-tab" role="tabpanel" hidden={tabActiva !== "encargos"}>
        {USE_MODERN_UI ? (
          <EncargosTableModern
            encargos={encargosResumen}
            onActualizarEstado={(id, estado) =>
              handleActualizarEstado(id, estado, "encargos")
            }
            role={role}
          />
        ) : (
          <EncargosTable
            encargos={encargosResumen}
            onActualizarEstado={(id, estado) =>
              handleActualizarEstado(id, estado, "encargos")
            }
            role={role}
          />
        )}
      </div>
    </div>
  );
};

export default VentasEncargos;
