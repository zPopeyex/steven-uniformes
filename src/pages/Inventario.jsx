// 📄 src/pages/Inventario.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import InventarioForm from "../components/InventarioForm";
import InventarioTable from "../components/InventarioTable";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/inventario.css";
import { FaFilter } from "react-icons/fa";

const removeDiacritics = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");

const norm = (s) =>
  removeDiacritics(
    String(s || "")
      .trim()
      .toLowerCase()
  );

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [productoInicial, setProductoInicial] = useState(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);
  const { role } = useAuth();

  const cargarInventario = async () => {
    const snap = await getDocs(collection(db, "inventario"));
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setInventario(docs);
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // ✅ Escaneo de QR
  const handleQRDetectado = (codigo) => {
    if (!codigo) return;
    const partes = codigo.split("-");
    const [colegio, prenda, talla, precio] = partes;
    if (colegio && prenda && talla && precio) {
      setProductoInicial({
        colegio,
        prenda,
        talla,
        precio,
        cantidad: "",
      });
      console.log("Producto QR escaneado:", { colegio, prenda, talla, precio });
      setMostrarEscaner(false);
    } else {
      alert("El código QR no tiene el formato esperado.");
    }
  };

  const handleScanToggle = () => {
    setMostrarEscaner((prev) => !prev);
  };

  // ✅ Agregar al inventario y también al stock_actual
  const handleAgregarInventario = async (productoFinal) => {
    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }
    try {
      const invPayload = {
        ...productoFinal,
        fechaHora: serverTimestamp(),
      };
      await addDoc(collection(db, "inventario"), invPayload);

      // Si es compra a proveedor, registrar también en compras_telas para que aparezca en /proveedores
      if (String(productoFinal.origen || "").toLowerCase() === "proveedor") {
        const unit = Number(productoFinal.costoUnidad || 0);
        const qty = Number(productoFinal.cantidad || 0);
        const total = Number(productoFinal.costoTotal || unit * qty || 0);
        const compra = {
          proveedorId: productoFinal.proveedorId || "",
          proveedorNombre: productoFinal.proveedorNombre || "",
          codigo_tela: `${productoFinal.colegio || ""}-${productoFinal.prenda || ""}-${productoFinal.talla || ""}`,
          metros: qty, // usamos cantidad como métricas/metros
          valor_unitario: unit,
          valor_total: total,
          fechaHora: serverTimestamp(),
        };
        try {
          await addDoc(collection(db, "compras_telas"), compra);
        } catch (e) {
          console.warn("No se pudo registrar la compra en compras_telas:", e);
        }
      }

      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", productoFinal.colegio),
        where("prenda", "==", productoFinal.prenda),
        where("talla", "==", productoFinal.talla)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        // No existe en stock, crear nuevo
        await addDoc(collection(db, "stock_actual"), {
          ...productoFinal,
          cantidad: parseInt(productoFinal.cantidad || 1),
        });
      } else {
        // Existe, actualizar cantidad sumando
        const docRef = snap.docs[0].ref;
        const data = snap.docs[0].data();
        await updateDoc(docRef, {
          cantidad:
            parseInt(data.cantidad || 0) +
            parseInt(productoFinal.cantidad || 1),
        });
      }

      cargarInventario();
      setProductoInicial(null);
    } catch (error) {
      console.error("Error al guardar en inventario:", error);
    }
  };

  // ✅ Eliminar de inventario y RESTAR del stock_actual
  const handleEliminar = async (id) => {
    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }
    try {
      const docRef = doc(db, "inventario", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const producto = docSnap.data();

      // Buscar el producto en stock_actual
      const q = query(
        collection(db, "stock_actual"),
        where("colegio", "==", producto.colegio),
        where("prenda", "==", producto.prenda),
        where("talla", "==", producto.talla)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const stockDoc = snap.docs[0];
        const stockData = stockDoc.data();
        const nuevaCantidad =
          parseInt(stockData.cantidad || 0) - parseInt(producto.cantidad || 1);

        if (nuevaCantidad > 0) {
          await updateDoc(stockDoc.ref, { cantidad: nuevaCantidad });
        } else {
          await deleteDoc(stockDoc.ref);
        }
      }

      // Eliminar del inventario
      await deleteDoc(docRef);
      cargarInventario();
    } catch (err) {
      console.error("Error eliminando producto:", err);
    }
  };

  const filteredInventario = useMemo(() => {
    const terms = norm(search).split(/\s+/).filter(Boolean);
    if (!terms.length) return inventario;
    return inventario.filter((row) => {
      const haystack = [row.colegio, row.prenda, row.talla].map(norm).join(" ");
      return terms.every((t) => haystack.includes(t));
    });
  }, [inventario, search]);

  const handleFilterClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="st-inv-page">
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
            <path d="M3 7l9 4 9-4" />
            <path d="M12 3v8" />
          </svg>
          <h2 className="st-inv-card-title">Agregar al Inventario</h2>
        </div>
        {role === "Admin" && (
          <InventarioForm
            productoEscaneado={productoInicial}
            onAgregar={handleAgregarInventario}
            mostrarEscaner={mostrarEscaner}
            onScanToggle={handleScanToggle}
            onQRDetectado={handleQRDetectado}
          />
        )}
      </div>

      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <h2 className="st-inv-card-title">
            Historial de ingreso de inventario
          </h2>
        </div>
        <div className="card-controls">
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar plantel o producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={handleFilterClick}>
            <FaFilter /> Filtrar
          </button>
        </div>
        <div className="st-inv-table-wrapper">
          <InventarioTable
            productos={filteredInventario}
            onEliminar={handleEliminar}
            role={role}
          />
        </div>
      </div>
    </div>
  );
};

export default Inventario;
