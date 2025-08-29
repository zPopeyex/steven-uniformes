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
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import VentasForm from "../components/VentasForm";
import VentasTable from "../components/VentasTable";
import EncargosTable from "../components/EncargosTable";
import Escaner from "../components/Escaner";
import { useAuth } from "../context/AuthContext.jsx";

const VentasEncargos = () => {
  const [ventas, setVentas] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoEscaneado, setProductoEscaneado] = useState(null);
  const [tabActiva, setTabActiva] = useState("ventas");
  const [totalVentas, setTotalVentas] = useState(0);
  const { role } = useAuth();

  // Cargar ventas y encargos al iniciar
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

  // Registrar venta y actualizar stock
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

  // Consecutivo único, con padding, para ENCARGOS
  async function getNextEncargoNumeroCorto(db) {
    const ref = doc(db, "parametros", "facturacionEncargos");
    const { numeroCorto } = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      let siguiente = 1;
      let longitud = 4;
      let prefijo = "";

      if (snap.exists()) {
        const d = snap.data() || {};
        siguiente = Number(d.siguiente || 1);
        longitud = Number(d.longitud || 4);
        prefijo = d.prefijo || "";
      }

      const numeroCorto = String(siguiente).padStart(longitud, "0");
      tx.set(
        ref,
        {
          siguiente: siguiente + 1,
          longitud,
          prefijo,
          actualizadoEn: serverTimestamp(),
        },
        { merge: true }
      );

      return { numeroCorto };
    });

    return numeroCorto;
  }

  // Registrar encargo
  const handleAgregarEncargo = async (data) => {
    try {
      // 1) Normalizar items: admite data.items o data.productos
      const srcItems =
        Array.isArray(data?.items) && data.items.length
          ? data.items
          : Array.isArray(data?.productos)
          ? data.productos
          : [];

      const items = srcItems.map((it) => {
        const cant = Number(it.cantidad ?? 0);
        const unit = Number(it.vrUnitario ?? it.precioUnit ?? it.precio ?? 0);
        return {
          producto: it.producto ?? it.prenda ?? "",
          plantel: it.plantel ?? it.colegio ?? "",
          talla: it.talla ?? "",
          cantidad: cant,
          vrUnitario: unit,
          vrTotal: Number(
            it.vrTotal ?? it.total ?? it.totalFila ?? cant * unit
          ),
        };
      });

      if (items.length === 0) {
        throw new Error("Sin productos en el encargo");
      }

      // 2) Normalizar cliente
      const clienteId =
        data.clienteId ?? data.cliente?.id ?? data.clienteResumen?.id ?? null;

      const clienteResumen =
        data.clienteResumen ??
        (data.cliente
          ? {
              nombre: data.cliente.nombre || "",
              telefono: data.cliente.telefono || "",
              documento: data.cliente.documento || "",
            }
          : null);

      if (!clienteId && !clienteResumen?.nombre) {
        throw new Error("Falta el cliente (id o nombre)");
      }

      // 3) Totales / estado / método de pago
      const total =
        Number(data.total) ||
        items.reduce((s, i) => s + (Number(i.vrTotal) || 0), 0);
      const abono = Number(data.abono ?? 0);
      const saldo = Number(data.saldo ?? total - abono);
      const metodoPago = data.metodoPago || data.formaPago || "efectivo";
      const estado = data.estado || "pendiente";

      // ✅ 4) Consecutivo corto para ENCARGOS (4 dígitos)
      const numeroCorto = await getNextEncargoNumeroCorto(db);

      const payload = {
        createdAt: data.createdAt || new Date().toISOString(),
        estado,
        clienteId: clienteId || null,
        clienteResumen: clienteResumen || null,
        items,
        total,
        abono,
        saldo,
        metodoPago,
        // nuevo
        numeroCorto, // "0001", "0042", etc.
        numeroPrevio: data.numero ?? null, // por si venía numerado antes
      };

      await addDoc(collection(db, "encargos"), payload);
      alert(`Encargo #${numeroCorto} registrado correctamente`);
      return true;
    } catch (err) {
      console.error("Error al registrar encargo:", err);
      alert(`Error al registrar encargo: ${err.message}`);
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

  // Envoltorio: obtiene numeroCorto y llama al onAgregar "de siempre"
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
          //onAgregar={handleAgregarVenta}

          onAgregar={
            (items) => guardarVentaConConsecutivo(items, handleAgregarVenta) // ← ventas (con consecutivo 0001, 0002, …)
          }
          // onAgregar={guardarVentaConConsecutivo}
          onAgregarEncargo={handleAgregarEncargo} // ← encargos
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
          encargos={encargos}
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
