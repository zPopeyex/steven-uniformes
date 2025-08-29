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

const VentasEncargos = () => {
  const [ventas, setVentas] = useState([]);
  const [encargos, setEncargos] = useState([]); // (se mantiene por compat)
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoEscaneado, setProductoEscaneado] = useState(null);
  const [tabActiva, setTabActiva] = useState("ventas");
  const [totalVentas, setTotalVentas] = useState(0);
  const { role } = useAuth();

  // Cargar ventas y encargos al iniciar (encargos aquí se mantiene, pero el tab usa la suscripción en vivo)
  const cargarDatos = async () => {
    try {
      const [ventasSnap, encargosSnap] = await Promise.all([
        getDocs(query(collection(db, "ventas"), orderBy("fechaHora", "desc"))),
        getDocs(query(collection(db, "encargos"), orderBy("fecha", "desc"))),
      ]);

      setVentas(ventasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setEncargos(
        encargosSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((encargo) => encargo.numeroFactura)
      );
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

  // Escanear QR
  const handleQRDetectado = (codigo) => {
    const partes = codigo.split("-");
    const [colegio, prenda, talla, precio] = partes;
    if (colegio && prenda && talla && precio) {
      setProductoEscaneado({
        colegio,
        prenda,
        talla,
        precio,
      });
      setMostrarEscaner(false);
    }
  };

  // === Resumen de Encargos en tiempo real (lee colección 'encargos', compat viejo/nuevo) ===
  const [encargosResumen, setEncargosResumen] = useState([]);
  const [filtrosEnc, setFiltrosEnc] = useState({
    estado: "todos",
    buscar: "",
  });

  useEffect(() => {
    // sin orderBy para no excluir antiguos sin createdAt; ordenamos en memoria
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

  // Registrar venta y actualizar stock (tu lógica original, la envolvemos para número corto)
  const handleAgregarVenta = async (itemsCarrito) => {
    try {
      const items = Array.isArray(itemsCarrito) ? itemsCarrito : [itemsCarrito];

      const itemsInvalidos = items.filter(
        (item) =>
          !item.colegio?.trim() ||
          !item.prenda?.trim() ||
          !item.talla?.trim() ||
          isNaN(item.precio) ||
          item.precio <= 0 ||
          isNaN(item.cantidad) ||
          item.cantidad <= 0
      );

      if (itemsInvalidos.length > 0) {
        throw new Error(
          `${itemsInvalidos.length} producto(s) no tienen todos los campos requeridos o valores inválidos`
        );
      }

      const numeroFactura = `FAC-${Date.now()}`;
      const fechaHora = serverTimestamp();

      const batch = items.map((item) => ({
        ...item,
        numeroFactura,
        fechaHora,
        abono: item.estado === "separado" ? Number(item.abono) || 0 : 0,
        saldo: item.estado === "separado" ? Number(item.saldo) || 0 : 0,
        cliente: item.cliente || "",
        precio: Number(item.precio),
        cantidad: Number(item.cantidad),
      }));

      await Promise.all(
        batch.map((item) => addDoc(collection(db, "ventas"), item))
      );

      const ventasNormales = items.filter((item) => item.estado === "venta");
      if (ventasNormales.length > 0) {
        await actualizarStock(ventasNormales);
      }

      cargarDatos();
      return true;
    } catch (error) {
      console.error("Error al registrar venta:", error);
      alert(`Error al registrar venta: ${error.message}`);
      return false;
    }
  };

  // Consecutivo único, con padding, para VENTAS (wrapper)
  const guardarVentaConConsecutivo = async (items, onAgregar) => {
    // 1) consecutivo
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
      return current; // el que usará esta venta
    });
    const numeroCorto = String(r).padStart(4, "0");

    // 2) añadimos numeroCorto a cada ítem y delegamos en tu "handleAgregarVenta"
    const conNumero = (Array.isArray(items) ? items : [items]).map((it) => ({
      ...it,
      numeroCorto,
      numeroPrevio: it.numeroFactura || null,
    }));

    return onAgregar(conNumero);
  };

  // ====== ENCARGOS ======

  // === contador transaccional para código corto ENC-0001 ===
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

  // Normalizador de items (acepta viejo: productos[] / nuevo: items[])
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

  // Guardar encargo (nuevo esquema + compat)
  const handleAgregarEncargo = async (encargo) => {
    try {
      // 1) cliente
      const clienteResumen = encargo.clienteResumen || encargo.cliente || null;
      const clienteId = encargo.clienteId || null;

      // 2) items y totales
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

      // 3) consecutivo corto
      const { codigoCorto, seq, year } = await getNextEncargoCode();

      // 4) payload nuevo (dejamos numeroFactura = codigoCorto por compat)
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

        // compat con data antigua
        numeroFactura: codigoCorto,
      };

      await addDoc(collection(db, "encargos"), payload);
      return true;
    } catch (e) {
      console.error("Error al registrar encargo:", e);
      alert(`Error al registrar encargo: ${e.message}`);
      return false;
    }
  };

  // Actualizar stock
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

  // Actualizar estado (venta/encargo)
  const handleActualizarEstado = async (id, nuevoEstado, coleccion) => {
    try {
      const docRef = doc(db, coleccion, id);
      await updateDoc(docRef, { estado: nuevoEstado });

      if (nuevoEstado === "venta" && coleccion === "ventas") {
        const ventaDoc = await getDoc(docRef);
        if (ventaDoc.exists()) {
          await actualizarStock([ventaDoc.data()]);
        }
      }

      cargarDatos();
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
            mostrarEscaner ? "Cerrar escáner" : "  Escanear código de barras"
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

      <div id="ventas-tab" role="tabpanel" hidden={tabActiva !== "ventas"}>
        <VentasForm
          productoEscaneado={productoEscaneado}
          onAgregar={(items) =>
            guardarVentaConConsecutivo(items, handleAgregarVenta)
          }
          onAgregarEncargo={handleAgregarEncargo}
        />

        <VentasTable
          ventas={ventas}
          totalVentas={totalVentas}
          onActualizarEstado={(id, estado) =>
            handleActualizarEstado(id, estado, "ventas")
          }
          role={role}
        />
      </div>

      <div id="encargos-tab" role="tabpanel" hidden={tabActiva !== "encargos"}>
        <EncargosTable
          // usamos la suscripción en vivo (compat viejo/nuevo)
          encargos={encargosResumen}
          onActualizarEstado={(id, estado) =>
            handleActualizarEstado(id, estado, "encargos")
          }
          role={role}
        />
      </div>
    </div>
  );
};

export default VentasEncargos;
