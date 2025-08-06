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
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import VentasForm from "../components/VentasForm";
import VentasTable from "../components/VentasTable";
import EncargosTable from "../components/EncargosTable";
import Escaner from "../components/Escaner";
import CardTable from "../components/CardTable"; // Ajusta la ruta si es necesario
import { useAuth } from "../context/AuthContext.jsx";

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoEscaneado, setProductoEscaneado] = useState(null);
  const [tabActiva, setTabActiva] = useState("ventas");
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

  // Registrar encargo
  // Registrar encargo
  const handleAgregarEncargo = async (encargo) => {
    try {
      if (
        !encargo.cliente?.nombre ||
        !encargo.cliente?.telefono ||
        !encargo.cliente?.formaPago ||
        !encargo.productos ||
        encargo.productos.length === 0
      ) {
        throw new Error("Faltan datos requeridos para el encargo");
      }

      const encargoData = {
        numeroFactura: `ENC-${Date.now()}`,
        cliente: encargo.cliente,
        productos: encargo.productos,
        total: encargo.total,
        abono: encargo.abono || 0,
        saldo: encargo.saldo || 0,
        estado: "pendiente",
        fecha: serverTimestamp(),
        observaciones: "",
      };

      await addDoc(collection(db, "encargos"), encargoData);
      cargarDatos();
      return true;
    } catch (error) {
      console.error("Error al registrar encargo:", error);
      alert(`Error al registrar encargo: ${error.message}`);
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
  // Calcula el total de ventas
  const totalVentas = ventas.reduce((sum, v) => sum + v.precio * v.cantidad, 0);
  return (
    <div style={{ padding: 20 }}>
      <h2>💰 Gestión de Ventas y Encargos</h2>

      <button
        onClick={() => setMostrarEscaner(!mostrarEscaner)}
        style={{
          backgroundColor: "#4CAF50",
          color: "white",
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
        }}
      >
        {mostrarEscaner ? "❌ Cerrar Escáner" : "📷 Escanear QR"}
      </button>

      {mostrarEscaner && <Escaner onScan={handleQRDetectado} />}

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setTabActiva("ventas")}
          style={{
            padding: "10px 20px",
            backgroundColor: tabActiva === "ventas" ? "#2196F3" : "#e0e0e0",
            color: tabActiva === "ventas" ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Ventas
        </button>
        <button
          onClick={() => setTabActiva("encargos")}
          style={{
            padding: "10px 20px",
            backgroundColor: tabActiva === "encargos" ? "#2196F3" : "#e0e0e0",
            color: tabActiva === "encargos" ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Encargos
        </button>
      </div>

      {tabActiva === "ventas" ? (
        <>
          <VentasForm
            productoEscaneado={productoEscaneado}
            onAgregar={handleAgregarVenta}
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
        </>
      ) : (
        <EncargosTable
          encargos={encargos}
          onActualizarEstado={(id, estado) =>
            handleActualizarEstado(id, estado, "encargos")
          }
          role={role}
        />
      )}
    </div>
  );
};

export default Ventas;
