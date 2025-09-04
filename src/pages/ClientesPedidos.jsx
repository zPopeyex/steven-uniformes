import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FaUsers,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaFilePdf,
  FaWhatsapp,
  FaPrint,
  FaEye,
  FaSave,
  FaSearch,
  FaFileInvoice,
} from "react-icons/fa";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  runTransaction,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import "../styles/client-table.css";
import "../styles/sistema-completo.css";
import ClientModal from "../components/clients/ClientModal";
import InvoicePreview from "../components/invoices/InvoicePreview";
import { limit } from "firebase/firestore";
import FacturaDetalle from "../components/FacturaDetalle";

const FaTemplate = FaFileInvoice;

export default function ClientesPedidos() {
  // UI
  const [activeModule, setActiveModule] = useState("clientes");
  const [showClientModal, setShowClientModal] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState({});

  const [offscreenInvoice, setOffscreenInvoice] = useState(null);
  const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || "";

  // Datos
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [plantillas, setPlantillas] = useState({
    ventas: null,
    encargos: null,
    pedidos: null,
  });
  // === Estados válidos de pedido ===
  const PEDIDO_ESTADOS = ["pendiente", "entregado", "pagado"];
  const ESTADO_EMOJI = {
    pendiente: "🕒",
    entregado: "📦",
    pagado: "✅",
  };

  async function abrirDetalleVenta(ventaResumen, cliente) {
    // 1) Traer TODAS las líneas de esa venta.
    //    Primero intentamos por numeroCorto (nuevo); si no hay, usamos numeroFactura (viejo).
    let lineas = [];
    if (ventaResumen?.numeroCorto) {
      const q = query(
        collection(db, "ventas"),
        where("numeroCorto", "==", ventaResumen.numeroCorto)
      );
      const qs = await getDocs(q);
      lineas = qs.docs.map((d) => d.data());
    }
    if (!lineas.length && ventaResumen?.numeroFactura) {
      const q2 = query(
        collection(db, "ventas"),
        where("numeroFactura", "==", ventaResumen.numeroFactura)
      );
      const qs2 = await getDocs(q2);
      lineas = qs2.docs.map((d) => d.data());
    }

    // 2) Normalizar ítems al formato de InvoicePreview
    const items = normalizeVentaItems(lineas);

    // 3) Totales
    const total = items.reduce((s, it) => s + (Number(it.vrTotal) || 0), 0);
    const abono = Number(ventaResumen.abono || 0);
    const saldo = Number(ventaResumen.saldo ?? total - abono);

    // 4) Armar el "data" que espera InvoicePreview
    const dataFactura = {
      numero: ventaResumen.numeroCorto ?? ventaResumen.numeroFactura ?? "",
      createdAt:
        ventaResumen.createdAt ||
        lineas[0]?.fechaHora ||
        new Date().toISOString(),
      cliente: ventaResumen.clienteResumen || {
        nombre: cliente?.nombre || ventaResumen.clienteNombre || "",
        telefono: cliente?.telefono || ventaResumen.clienteTelefono || "",
        documento: cliente?.documento || ventaResumen.clienteDocumento || "",
        direccion: cliente?.direccion || ventaResumen.clienteDireccion || "",
      },
      items,
      total,
      abono,
      saldo,
      observaciones: ventaResumen.observaciones || "",
    };

    // 5) Mostrar modal con factura
    setShowInvoicePreview({ tipo: "ventas", data: dataFactura });
  }
  // 🔹 Firestore Timestamp / ISO / ms -> Date
  const parseFsDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    if (v.seconds) return new Date(v.seconds * 1000);
    return new Date(v);
  };
  // Timestamp / ISO / ms -> ISO string
  const asISO = (v) => {
    const d = parseFsDate(v);
    return d ? d.toISOString() : new Date().toISOString();
  };

  const toDate = (ts) =>
    ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);

  const labelEstado = (estado) => `${ESTADO_EMOJI[estado] ?? "📄"} ${estado}`;

  // Cambia el estado en Firestore
  const updatePedidoEstado = async (pedidoId, nuevoEstado) => {
    if (!PEDIDO_ESTADOS.includes(nuevoEstado)) return;
    await updateDoc(doc(db, "pedidos", pedidoId), {
      estado: nuevoEstado,
      updatedAt: new Date().toISOString(),
    });
  };
  // --- Modo edición de pedido ---
  const [editingPedidoId, setEditingPedidoId] = useState(null); // id del doc en Firestore
  const [editingPedidoNumero, setEditingPedidoNumero] = useState(null); // preserva el "0001"
  const [editingPedidoCreatedAt, setEditingPedidoCreatedAt] = useState(null); // preserva fecha original

  // === Consecutivo seguro 4 dígitos para pedidos ===
  const getNextPedidoConsecutivo = async () => {
    const ref = doc(db, "counters", "pedidos");
    const next = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, { value: 1 });
        return 1;
      }
      const current = Number(snap.data().value) || 0;
      const n = current + 1;
      tx.update(ref, { value: n });
      return n;
    });
    return String(next).padStart(4, "0");
  };

  // Agrupa docs de "ventas" (cada doc = 1 ítem) por número de factura
  const agruparVentasPorNumero = (ventasDeCliente = []) => {
    const byNum = new Map();

    ventasDeCliente.forEach((v) => {
      const numero = v.numeroCorto || v.numeroFactura || v.numero || v.id;

      const base = byNum.get(numero) || {
        numero,
        createdAt:
          v.fechaHora ||
          v.createdAt ||
          v._createdAt ||
          new Date().toISOString(),
        clienteId: v.clienteId || null,
        clienteResumen: v.clienteResumen || null,
        estado: v.estado || null,
        total: 0,
        items: [],
      };

      // cada doc de ventas equivale a un item del comprobante
      const cantidad = Number(v.cantidad) || 0;
      const vrUnit = Number(v.precio) || Number(v.vrUnitario) || 0;

      base.items.push({
        producto: v.prenda || v.producto || "",
        plantel: v.colegio || v.plantel || "",
        talla: v.talla || "",
        cantidad,
        vrUnitario: vrUnit,
        vrTotal: vrUnit * cantidad,
      });

      base.total += vrUnit * cantidad;
      byNum.set(numero, base);
    });

    // orden descendente por fecha
    return Array.from(byNum.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  // ===== Helper: precio por Plantel + Producto + Talla =====
  const getPrecioFromCatalog = (plantel, producto, talla) => {
    const arr = catalogIndex.byColegio?.[plantel]?.[producto] || [];
    const m = arr.find((x) => (x.talla || "").trim() === (talla || "").trim());
    return m ? Number(m.precio) || 0 : 0;
  };

  // ====== WhatsApp & PDF/Print ======
  const INVOICE_HOST_ID = "invoice-print-host";

  const handleDownloadPDF = () => {
    const node = document.getElementById(INVOICE_HOST_ID);
    if (!node) return;

    const styles = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )
      .map((el) => el.outerHTML)
      .join("\n");

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert(
        "Tu navegador bloqueó la ventana de impresión. Habilita pop-ups para este sitio."
      );
      return;
    }
    const numero =
      showInvoicePreview?.data?.numero ||
      showInvoicePreview?.data?.id ||
      "Factura";
    win.document.write(`
    <html>
      <head>
        <title>Factura ${numero}</title>
        ${styles}
        <style>
          @page { margin: 16mm; }
          body { background: #fff !important; }
        </style>
      </head>
      <body>${node.innerHTML}</body>
    </html>
  `);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  const handleShareWhatsApp = () => {
    const data = showInvoicePreview?.data;
    if (!data) return;

    const digits = String(data?.cliente?.telefono || "").replace(/\D/g, "");
    const msisdn = digits.startsWith("57") ? digits : `57${digits}`;
    const base = `https://api.whatsapp.com/send?phone=${msisdn}`;

    const textEncoded = buildWaTextEncoded({ data, shortUrl: "" });
    window.open(`${base}&text=${textEncoded}`, "_blank");
  };

  const handlePrint = () => handleDownloadPDF();

  // ===== Catálogo dinámico desde Firestore =====
  const [catalogoDocs, setCatalogoDocs] = useState([]);
  const [plantelesAll, setPlantelesAll] = useState([]);
  const [catalogIndex, setCatalogIndex] = useState({
    byColegio: {},
  });
  const ordenGeneral = [
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];
  const ordenPantalon = [
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "28",
    "30",
    "32",
    "34",
    "36",
    "38",
    "40",
  ];
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Forms
  const [clientForm, setClientForm] = useState({
    nombre: "",
    cedulaNit: "",
    telefono: "",
    direccion: "",
    notas: "",
    activo: true,
  });

  const [pedidoForm, setPedidoForm] = useState({
    clienteId: "",
    observaciones: "",
    abono: 0,
    estado: "pendiente",
    items: [
      {
        producto: "",
        plantel: "",
        talla: "",
        cantidad: 1,
        vrUnitario: 0,
        vrTotal: 0,
      },
    ],
  });

  // Suscripciones Firestore
  useEffect(() => {
    const qClientes = query(
      collection(db, "clientes"),
      orderBy("fechaCreacion", "desc")
    );
    const unsubClientes = onSnapshot(qClientes, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qPedidos = query(
      collection(db, "pedidos"),
      orderBy("createdAt", "desc")
    );
    const unsubPedidos = onSnapshot(qPedidos, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    // AGREGAR ESTA NUEVA SUSCRIPCIÓN PARA VENTAS
    const qVentas = query(
      collection(db, "ventas"),
      orderBy("fechaHora", "desc")
    );
    const unsubVentas = onSnapshot(qVentas, (snap) => {
      setVentas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // ⬇️ NUEVO: encargos
    const qEncargos = query(
      collection(db, "encargos"),
      orderBy("createdAt", "desc")
    );
    const unsubEncargos = onSnapshot(qEncargos, (snap) => {
      setEncargos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTemplates = [
      onSnapshot(doc(db, "invoice_templates", "ventas"), (d) => {
        setPlantillas((p) => ({
          ...p,
          ventas: d.exists() ? d.data() : defaultTemplates.ventas,
        }));
      }),
      onSnapshot(doc(db, "invoice_templates", "encargos"), (d) => {
        setPlantillas((p) => ({
          ...p,
          encargos: d.exists() ? d.data() : defaultTemplates.encargos,
        }));
      }),
      onSnapshot(doc(db, "invoice_templates", "pedidos"), (d) => {
        setPlantillas((p) => ({
          ...p,
          pedidos: d.exists() ? d.data() : defaultTemplates.pedidos,
        }));
      }),
    ];

    return () => {
      unsubClientes();
      unsubPedidos();
      unsubVentas(); // AGREGAR ESTA LÍNEA
      unsubEncargos(); // ⬅️ NUEVO
      unsubTemplates.forEach((u) => u());
    };
  }, []);

  // Convierte cualquier doc de venta (con prenda/precio, etc.) al formato que usa InvoicePreview
  function normalizeVentaItems(rawItemsOrDocs) {
    const list = Array.isArray(rawItemsOrDocs) ? rawItemsOrDocs : [];

    return list.map((i) => {
      const cantidad = Number(i.cantidad ?? i.qty ?? i.unidades ?? 0);
      const precioUnit = Number(i.precioUnit ?? i.precio ?? i.vrUnitario ?? 0);

      return {
        // claves que espera InvoicePreview
        producto: i.producto ?? i.prenda ?? i.descripcion ?? "",
        plantel: i.colegio ?? i.plantel ?? "",
        talla: i.talla ?? i.tam ?? "",
        cantidad,
        vrUnitario: precioUnit,
        vrTotal: Number(i.totalFila ?? i.vrTotal ?? cantidad * precioUnit),
      };
    });
  }

  // Cargar catálogo
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos_catalogo"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCatalogoDocs(docs);

      const idx = {};
      const plantelesSet = new Set();
      docs.forEach((it) => {
        const colegio = (it.colegio || "").trim();
        const prenda = (it.prenda || "").trim();
        const talla = (it.talla || "").trim();
        const precio = parseFloat(it.precio) || 0;
        if (!colegio || !prenda || !talla) return;
        plantelesSet.add(colegio);
        if (!idx[colegio]) idx[colegio] = {};
        if (!idx[colegio][prenda]) idx[colegio][prenda] = [];
        idx[colegio][prenda].push({ talla, precio });
      });

      Object.keys(idx).forEach((col) => {
        Object.keys(idx[col]).forEach((pr) => {
          const order = norm(pr) === "pantalon" ? ordenPantalon : ordenGeneral;
          idx[col][pr].sort((a, b) => {
            const ia = order.indexOf(String(a.talla));
            const ib = order.indexOf(String(b.talla));
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          });
        });
      });
      setCatalogIndex({ byColegio: idx });
      setPlantelesAll(Array.from(plantelesSet).sort());
    });
    return () => unsub();
  }, []);

  const defaultTemplates = {
    ventas: {
      logoUrl: "https://via.placeholder.com/200x80/0052CC/FFFFFF?text=LOGO",
      camposVisibles: {
        cliente: true,
        telefono: true,
        cedula: true,
        direccion: true,
        notas: true,
        abono: false,
        saldo: false,
      },
      headerText: "FACTURA DE VENTA",
      footerText: "Gracias por su compra",
    },
    encargos: {
      logoUrl: "https://via.placeholder.com/200x80/0052CC/FFFFFF?text=LOGO",
      camposVisibles: {
        cliente: true,
        telefono: true,
        cedula: true,
        direccion: true,
        notas: true,
        abono: true,
        saldo: true,
      },
      headerText: "ORDEN DE ENCARGO",
      footerText: "Su pedido será procesado a la brevedad",
    },
    pedidos: {
      logoUrl: "https://via.placeholder.com/200x80/0052CC/FFFFFF?text=LOGO",
      camposVisibles: {
        cliente: true,
        telefono: true,
        cedula: false,
        direccion: true,
        notas: true,
        abono: true,
        saldo: true,
      },
      headerText: "PEDIDO",
      footerText: "Contáctenos para cualquier consulta",
    },
  };

  // Clientes
  const handleSaveClient = async () => {
    if (!clientForm.nombre || !clientForm.telefono) {
      alert("Por favor complete los campos requeridos");
      return;
    }

    if (editingClient) {
      await updateDoc(doc(db, "clientes", editingClient.id), { ...clientForm });
    } else {
      await addDoc(collection(db, "clientes"), {
        ...clientForm,
        fechaCreacion: new Date().toISOString(),
      });
    }

    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({
      nombre: "",
      cedulaNit: "",
      telefono: "",
      direccion: "",
      notas: "",
      activo: true,
    });
  };

  const handleDeleteClient = async (id) => {
    if (confirm("¿Eliminar cliente?")) {
      await deleteDoc(doc(db, "clientes", id));
    }
  };

  const handleToggleClientActive = async (id) => {
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    await updateDoc(doc(db, "clientes", id), { activo: !c.activo });
  };

  // Pedidos
  const handleAddItemPedido = () => {
    setPedidoForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          producto: "",
          plantel: "",
          talla: "",
          cantidad: 1,
          vrUnitario: 0,
          vrTotal: 0,
        },
      ],
    }));
  };

  const handleRemoveItemPedido = (index) => {
    if (pedidoForm.items.length > 1) {
      setPedidoForm((f) => ({
        ...f,
        items: f.items.filter((_, i) => i !== index),
      }));
    }
  };
  const handleDeletePedido = async (id, numero) => {
    if (
      !confirm(
        `¿Eliminar el pedido ${numero || id}? Esta acción no se puede deshacer.`
      )
    )
      return;
    await deleteDoc(doc(db, "pedidos", id));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...pedidoForm.items];
    items[index][field] = value;
    if (field === "cantidad" || field === "vrUnitario") {
      const cantidad = parseFloat(items[index].cantidad) || 0;
      const vrUnitario = parseFloat(items[index].vrUnitario) || 0;
      items[index].vrTotal = cantidad * vrUnitario;
    }
    setPedidoForm((f) => ({ ...f, items }));
  };

  const calculatePedidoTotal = () =>
    pedidoForm.items.reduce((s, i) => s + (i.vrTotal || 0), 0);

  const handleSavePedido = async () => {
    if (!pedidoForm.clienteId) {
      alert("Seleccione un cliente");
      return;
    }

    const total = calculatePedidoTotal();
    const cliente = clientes.find((c) => c.id === pedidoForm.clienteId);

    // Payload común
    const payload = {
      clienteId: pedidoForm.clienteId,
      clienteNombre: cliente?.nombre || "",
      items: pedidoForm.items.filter((i) => i.producto && i.vrTotal > 0),
      total,
      abono: parseFloat(pedidoForm.abono) || 0,
      saldo: total - (parseFloat(pedidoForm.abono) || 0),
      estado: pedidoForm.estado,
      observaciones: pedidoForm.observaciones,
    };

    try {
      if (editingPedidoId) {
        // 🔄 ACTUALIZAR (NO romper número ni fecha original)
        await updateDoc(doc(db, "pedidos", editingPedidoId), {
          ...payload,
          numero: editingPedidoNumero || null,
          createdAt: editingPedidoCreatedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        alert(`Pedido ${editingPedidoNumero || editingPedidoId} actualizado`);
      } else {
        // 🆕 CREAR (consecutivo 0001, 0002, ...)
        const numero = await getNextPedidoConsecutivo();
        await addDoc(collection(db, "pedidos"), {
          ...payload,
          createdAt: new Date().toISOString(),
          numero,
        });
        alert(`Pedido ${numero} guardado`);
      }
    } finally {
      // Reset formulario y salir de edición si aplica
      setEditingPedidoId(null);
      setEditingPedidoNumero(null);
      setEditingPedidoCreatedAt(null);

      setPedidoForm({
        clienteId: "",
        observaciones: "",
        abono: 0,
        estado: "pendiente",
        items: [
          {
            producto: "",
            plantel: "",
            talla: "",
            cantidad: 1,
            vrUnitario: 0,
            vrTotal: 0,
          },
        ],
      });
    }
  };

  // Carga un pedido en el formulario para editar
  const startEditPedido = (pedido) => {
    setActiveModule("pedidos"); // te lleva al tab de pedidos
    setEditingPedidoId(pedido.id);
    setEditingPedidoNumero(pedido.numero || null);
    setEditingPedidoCreatedAt(pedido.createdAt || null);

    setPedidoForm({
      clienteId: pedido.clienteId || "",
      observaciones: pedido.observaciones || "",
      abono: Number(pedido.abono) || 0,
      estado: pedido.estado || "pendiente",
      items: (pedido.items || []).map((it) => ({
        producto: it.producto || "",
        plantel: it.plantel || "",
        talla: it.talla || "",
        cantidad: Number(it.cantidad) || 1,
        vrUnitario: Number(it.vrUnitario) || 0,
        vrTotal:
          Number(it.vrTotal) ||
          (Number(it.cantidad) || 0) * (Number(it.vrUnitario) || 0),
      })),
    });

    // scroll al formulario
    requestAnimationFrame(() => {
      const el = document.querySelector(".card .card-title"); // título "Nuevo Pedido"
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Normaliza líneas de venta al formato que espera InvoicePreview
  const normalizarLineasVenta = (raw = []) =>
    (Array.isArray(raw) ? raw : []).map((i) => {
      const cantidad = Number(i.cantidad ?? i.qty ?? 0);
      const unit = Number(i.precioUnit ?? i.precio ?? i.vrUnitario ?? 0);
      return {
        producto: i.producto ?? i.prenda ?? i.descripcion ?? "",
        plantel: i.colegio ?? i.plantel ?? "",
        talla: i.talla ?? "",
        cantidad,
        vrUnitario: unit,
        vrTotal: Number(i.vrTotal ?? i.totalFila ?? cantidad * unit),
      };
    });

  // ⬅️ Este reemplaza tu inline setShowInvoicePreview para VENTAS
  const verDetalleVenta = async (venta, cliente) => {
    // 1) intentar por numeroCorto (nuevo), si no existe usar numeroFactura (viejo)
    let snap = null;

    if (venta?.numeroCorto) {
      const q1 = query(
        collection(db, "ventas"),
        where("numeroCorto", "==", venta.numeroCorto)
      );
      snap = await getDocs(q1);
    }
    if (!snap || snap.empty) {
      const q2 = query(
        collection(db, "ventas"),
        where("numeroFactura", "==", venta.numeroFactura || "")
      );
      snap = await getDocs(q2);
    }

    // 2) Si hay docs “línea por producto”, úsalos; si no, intenta items embebidos
    const lineas = snap?.empty ? [] : snap.docs.map((d) => d.data());
    const items = lineas.length
      ? normalizarLineasVenta(lineas)
      : normalizarLineasVenta(venta?.items || []);

    // 3) Totales
    const total = items.reduce((s, it) => s + (Number(it.vrTotal) || 0), 0);
    const abono = Number(venta?.abono || 0);
    const saldo = Number(venta?.saldo ?? total - abono);

    // 4) Armar data para el componente de factura
    setShowInvoicePreview({
      tipo: "ventas",
      data: {
        ...venta,
        numero: venta?.numeroCorto || venta?.numeroFactura || venta?.id || "",
        createdAt:
          venta?.createdAt || lineas[0]?.fechaHora || new Date().toISOString(),
        cliente: venta?.clienteResumen || cliente || {},
        items,
        total,
        abono,
        saldo,
      },
    });
  };

  const normalizarLineasPedido = (raw = []) =>
    (Array.isArray(raw) ? raw : []).map((i) => {
      const cantidad = Number(i.cantidad ?? 0);
      const unit = Number(i.vrUnitario ?? i.precioUnit ?? 0);
      return {
        producto: i.producto ?? i.prenda ?? i.descripcion ?? "",
        plantel: i.plantel ?? i.colegio ?? "",
        talla: i.talla ?? "",
        cantidad,
        vrUnitario: unit,
        vrTotal: Number(i.vrTotal ?? i.totalFila ?? cantidad * unit),
      };
    });

  const verDetallePedido = async (pedido, cliente) => {
    try {
      let latest = pedido;
      if (pedido?.id) {
        const snap = await getDoc(doc(db, "pedidos", pedido.id));
        if (snap.exists()) latest = { id: snap.id, ...snap.data() };
      }
      const items = normalizarLineasPedido(latest?.items || []);
      const total = Number(
        latest?.total ?? items.reduce((s, it) => s + (Number(it.vrTotal) || 0), 0)
      );
      const abono = Number(latest?.abono || 0);
      const saldo = Number(latest?.saldo ?? total - abono);

      setShowInvoicePreview({
        tipo: "pedidos",
        data: {
          ...latest,
          tipo: "pedidos",
          numero: latest?.numero || latest?.id || "",
          createdAt: latest?.createdAt || new Date().toISOString(),
          cliente: cliente || latest?.cliente || {},
          items,
          total,
          abono,
          saldo,
        },
      });
    } catch (e) {
      // fallback a los datos actuales si algo falla
      const items = normalizarLineasPedido(pedido?.items || []);
      const total = Number(
        pedido?.total ?? items.reduce((s, it) => s + (Number(it.vrTotal) || 0), 0)
      );
      const abono = Number(pedido?.abono || 0);
      const saldo = Number(pedido?.saldo ?? total - abono);
      setShowInvoicePreview({
        tipo: "pedidos",
        data: {
          ...pedido,
          tipo: "pedidos",
          numero: pedido?.numero || pedido?.id || "",
          createdAt: pedido?.createdAt || new Date().toISOString(),
          cliente: cliente || pedido?.cliente || {},
          items,
          total,
          abono,
          saldo,
        },
      });
    }
  };

  // Plantillas
  const openTemplateEditor = (tipo) => {
    setEditingTemplate({
      tipo,
      data: plantillas[tipo] || defaultTemplates[tipo],
    });
    setShowTemplateEditor(true);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    await setDoc(
      doc(db, "invoice_templates", editingTemplate.tipo),
      editingTemplate.data,
      { merge: true }
    );
    setShowTemplateEditor(false);
    setEditingTemplate(null);
    alert("Plantilla guardada");
  };

  // Filtros
  const filteredClientes = useMemo(
    () =>
      clientes.filter(
        (c) =>
          (c.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.telefono || "").includes(searchTerm) ||
          (c.cedulaNit || "").includes(searchTerm)
      ),
    [clientes, searchTerm]
  );

  const filteredPedidos = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          (p.clienteNombre || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (p.id || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [pedidos, searchTerm]
  );

  // Utilidades
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  const renderInvoiceToCanvas = async (data, tipo = "pedidos") => {
    setOffscreenInvoice({ tipo, data });
    await pause(60);
    const host = document.getElementById("invoice-offscreen");
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#fff",
      useCORS: true,
      logging: false,
    });
    setOffscreenInvoice(null);
    return canvas;
  };

  const buildInvoicePdfBlob = async (data, tipo = "pedidos") => {
    const canvas = await renderInvoiceToCanvas(data, tipo);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 28;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, "", "FAST");

    try {
      const host = document.getElementById("invoice-offscreen");
      const a = host?.querySelector('a[data-ctype="company-wa"]');
      if (a) {
        const hostRect = host.getBoundingClientRect();
        const r = a.getBoundingClientRect();

        const relLeft = r.left - hostRect.left;
        const relTop = r.top - hostRect.top;

        const k = imgW / canvas.width;
        const PAD = 8;

        const x = margin + (relLeft - PAD) * k;
        const y = margin + (relTop - PAD / 2) * k;
        const w = (r.width + PAD * 2) * k;
        const h = (r.height + PAD) * k;

        const url = a.href || "https://wa.me/573172841355";
        pdf.link(x, y, Math.max(w, 60), Math.max(h, 16), { url });
      }
    } catch (e) {
      console.warn("No se pudo anotar link en PDF (Discord):", e);
    }

    return pdf.output("blob");
  };

  const uploadPdfToDiscord = async (blob, filename) => {
    if (!DISCORD_WEBHOOK_URL) throw new Error("Falta VITE_DISCORD_WEBHOOK_URL");

    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("payload_json", JSON.stringify({ content: "" }));

    const res = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Discord webhook error: ${res.status} ${txt}`);
    }
    const json = await res.json();
    const url = json?.attachments?.[0]?.url;
    if (!url) throw new Error("Discord no devolvió URL de archivo");
    return url;
  };

  /** Intenta acortar con is.gd y si falla usa TinyURL. Si todo falla, retorna la limpia. */
  const shortenUrl = async (url) => {
    const target = url; // mantener query de Discord

    const tryShort = async (api) => {
      const r = await fetch(api);
      if (!r.ok) throw new Error("shortener failed");
      const t = (await r.text()).trim();
      if (/^https?:\/\//i.test(t)) return t;
      throw new Error("invalid short url");
    };

    try {
      return await tryShort(
        `https://is.gd/create.php?format=simple&url=${encodeURIComponent(
          target
        )}`
      );
    } catch {
      try {
        return await tryShort(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(target)}`
        );
      } catch {
        return target; // fallback: sin acortar pero funcional
      }
    }
  };

  /** Deduce género del cliente: f/m/null */
  const getClienteGenero = (cli) => {
    const g = (cli?.genero || cli?.sexo || "").toLowerCase();
    if (g.startsWith("f")) return "f";
    if (g.startsWith("m")) return "m";
    return null;
  };
  // Emojis en secuencias UTF-16 (seguras si el archivo no está en UTF-8)
  const EMOJI = {
    wave: "\uD83D\uDC4B\uD83C\uDFFC", // 👋🏼
    link: "\uD83D\uDD17", // 🔗
    memo: "\uD83D\uDDD2\uFE0F", // 🗒️
    scales: "\u2696\uFE0F", // ⚖️
    phone: "\uD83D\uDCDE", // 📞
  };
  // Emojis como BYTES UTF-8 percent-encodados (para WhatsApp)
  const EMOJI_HEX = {
    wave: "%F0%9F%91%8B%F0%9F%8F%BC", // 👋🏼
    link: "%F0%9F%94%97", // 🔗
    memo: "%F0%9F%97%92%EF%B8%8F", // 🗒️
    scales: "%E2%9A%96%EF%B8%8F", // ⚖️
    phone: "%F0%9F%93%9E", // 📞
  };
  // --- Texto WA ya percent-encodado + emojis en crudo (hex) ---
  const buildWaTextEncoded = ({ data, shortUrl }) => {
    const numero = data?.numero || data?.id || "";
    const cli = data?.cliente || {};
    const nombre = cli?.nombre || cli?.displayName || "Cliente";
    const g = (cli?.genero || cli?.sexo || "").toLowerCase();
    const genero = g.startsWith("f") ? "f" : g.startsWith("m") ? "m" : null;

    const saludo =
      genero === "f"
        ? `Estimada *Sra. ${nombre}*:`
        : genero === "m"
        ? `Estimado *Sr. ${nombre}*:`
        : `Estimado(a)\n *${nombre}*:`; // fallback

    const atentoAtenta =
      genero === "f" ? "atenta" : genero === "m" ? "atento" : "atento(a)";
    const companyName =
      (typeof COMPANY !== "undefined" && COMPANY?.name) ||
      "Steven todo en Uniformes.";
    const companyPhone =
      (typeof COMPANY !== "undefined" && COMPANY?.phonePretty) || "3172841355";

    const segs = [
      saludo,
      "\n\n",
      "Reciba un cordial saludo. ",
      { raw: EMOJI_HEX.wave },
      "\n\n",
      "Por medio del presente, me permito hacerle llegar la factura correspondiente al\n",
      { raw: EMOJI_HEX.memo },
      ` *Pedido No. ${numero}*.\n\n`,
      "Podrá acceder al documento a través del siguiente enlace:\n",
      { raw: EMOJI_HEX.link },
      ` *[* ${shortUrl || ""} *]*\n\n`,
      `Quedo ${atentoAtenta} a cualquier consulta o aclaración que pueda requerir.\n`,
      "Agradezco su atención y confianza.\n",
      "Saludos cordiales,\n\n",
      `*${companyName}*\n`,
      { raw: EMOJI_HEX.scales },
      " Representante legal.\n",
      { raw: EMOJI_HEX.phone },
      ` ${companyPhone}`,
    ];

    // Strings normales -> encodeURIComponent, los {raw} (emojis) se inyectan tal cual
    return segs
      .map((s) => (typeof s === "string" ? encodeURIComponent(s) : s.raw))
      .join("");
  };

  /** Normaliza teléfono a MSISDN colombiano y arma la base de WhatsApp */
  const buildWaBase = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 8) {
      // sin número válido → pantalla de WhatsApp genérica
      return "https://api.whatsapp.com/send";
    }
    const msisdn = digits.startsWith("57") ? digits : `57${digits}`;
    return `https://api.whatsapp.com/send?phone=${msisdn}`;
  };

  /** Agrega el texto a la URL de WhatsApp con codificación y normalización NFC */
  const withWaText = (base, text) => {
    const safe = String(text || "").normalize("NFC");
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}text=${encodeURIComponent(safe)}`;
  };

  /** Mensaje formal con negritas (sin comillas) y sin líneas en blanco extra */
  const buildWhatsAppFormalMessage = ({ data, shortUrl }) => {
    const numero = data?.numero || data?.id || "";
    const cli = data?.cliente || {};
    const nombre = cli?.nombre || cli?.displayName || "Cliente";
    const genero = getClienteGenero(cli); // "f" | "m" | null

    const saludo =
      genero === "f"
        ? `Estimada *Sra. ${nombre}*:`
        : genero === "m"
        ? `Estimado *Sr. ${nombre}*:`
        : `Estimado(a) *${nombre}*:`; // fallback

    const atentoAtenta =
      genero === "f" ? "atenta" : genero === "m" ? "atento" : "atento(a)";
    const companyName =
      (typeof COMPANY !== "undefined" && COMPANY?.name) ||
      "Steven todo en Uniformes.";
    const companyPhone =
      (typeof COMPANY !== "undefined" && COMPANY?.phonePretty) || "3172841355";

    const segs = [
      saludo,
      "\n\n",
      "Reciba un cordial saludo. ",
      { raw: EMOJI_HEX.wave },
      "\n\n",
      "Por medio del presente, me permito hacerle llegar la factura correspondiente al\n",
      { raw: EMOJI_HEX.memo },
      ` *Pedido No. ${numero}*.\n\n`,
      "Podrá acceder al documento a través del siguiente enlace:\n",
      { raw: EMOJI_HEX.link },
      ` *[* ${shortUrl || ""} *]*\n\n`,
      `Quedo ${atentoAtenta} a cualquier consulta o aclaración que pueda requerir.\n`,
      "Agradezco su atención y confianza.\n",
      "Saludos cordiales,\n\n",
      `*${companyName}*\n`,
      { raw: EMOJI_HEX.scales },
      " Representante legal.\n",
      { raw: EMOJI_HEX.phone },
      ` ${companyPhone}`,
    ];
    return segs
      .map((s) => (typeof s === "string" ? encodeURIComponent(s) : s.raw))
      .join("");
  };

  const buildInvoiceText = (rawData) => {
    const data = rawData || {};
    const numero = data.numero || data.id || "";
    const fecha = data.createdAt
      ? new Date(data.createdAt).toLocaleDateString("es-CO")
      : new Date().toLocaleDateString("es-CO");

    const cli = data.cliente || {};
    const clienteLinea = cli.nombre
      ? `Cliente: ${cli.nombre}${cli.telefono ? ` (${cli.telefono})` : ""}`
      : "";

    const itemsArr = Array.isArray(data.items) ? data.items : [];
    const itemsTxt = itemsArr
      .map((it) => {
        const cantidad = Number(it?.cantidad) || 0;
        const producto = it?.producto || "";
        const talla = it?.talla ? ` Talla ${it.talla}` : "";
        const plantel = it?.plantel ? ` - ${it.plantel}` : "";
        const vrUnit = Number(it?.vrUnitario) || 0;
        const vrTot = Number(it?.vrTotal) || cantidad * vrUnit || 0;
        return `• ${cantidad} x ${producto}${talla}${plantel} = $${vrTot.toLocaleString(
          "es-CO"
        )}`;
      })
      .join("\n");

    const total =
      Number(data.total) ||
      itemsArr.reduce((acc, it) => acc + (Number(it?.vrTotal) || 0), 0);
    const abono = Number(data.abono) || 0;
    const saldo = Number(data.saldo) || total - abono;

    const totalesLinea = `Total: $${total.toLocaleString(
      "es-CO"
    )}   Abono: $${abono.toLocaleString(
      "es-CO"
    )}   Saldo: $${saldo.toLocaleString("es-CO")}`;
    const obs = data.observaciones ? `Obs: ${data.observaciones}` : "";

    return [
      `PEDIDO ${numero} - ${fecha}`,
      clienteLinea,
      itemsTxt,
      totalesLinea,
      obs,
    ]
      .filter(Boolean)
      .join("\n");
  };

  // Adivina tratamiento si no existe: muy simple; mejor guarda "tratamiento" en el cliente.
  const guessFemale = (nombre = "") => /a$/i.test(nombre.trim());
  const getTratamiento = (cliente = {}) => {
    if (cliente.tratamiento === "Sr." || cliente.tratamiento === "Sra.") {
      return cliente.tratamiento;
    }
    const nombre = (cliente.nombre || "").trim().split(/\s+/)[0] || "";
    return guessFemale(nombre) ? "Sra." : "Sr.";
  };

  // Saludo completo + línea descriptiva de la factura
  const buildSaludoWhatsApp = (cliente = {}, numero = "") => {
    const nom = (cliente.nombre || "").trim();
    const [nombre = "", apellido = ""] = nom.split(/\s+/);
    const tratamiento = getTratamiento(cliente);
    // Si no hay apellido, no lo forzamos
    const nombreMostrar = [nombre, apellido].filter(Boolean).join(" ");
    return (
      `${tratamiento} ${nombreMostrar}, tenga un cordial saludo. ` +
      `Me permito enviarle la factura "Pedido No. ${numero}", ` +
      `que encontrará a continuación en el siguiente enlace:`
    );
  };

  /** WhatsApp ➜ genera PDF ➜ sube a Discord ➜ limpia y acorta URL ➜ abre chat con mensaje formal */
  const shareWhatsAppViaDiscord = async (data, tipo = "pedidos") => {
    const waWin = window.open("about:blank", "_blank"); // abre antes para evitar bloqueo

    const phoneRaw = data.cliente?.telefono || "";
    const digits = phoneRaw.replace(/\D/g, "");
    const msisdn = digits.startsWith("57") ? digits : `57${digits}`;
    const base = `https://api.whatsapp.com/send?phone=${msisdn}`;

    try {
      const numero = data.numero || data.id || Date.now();
      const blob = await buildInvoicePdfBlob(data, tipo);
      const fileUrl = await uploadPdfToDiscord(blob, `Pedido_${numero}.pdf`);

      // 1) limpia query de Discord  2) intenta acortar
      const shortUrl = await shortenUrl(fileUrl);
      // 👇 texto YA percent-encodado (emojis en crudo)
      const textEncoded = buildWaTextEncoded({ data, shortUrl });
      const waUrl = `${base}&text=${textEncoded}`;

      if (waWin) waWin.location.href = waUrl;
      else window.open(waUrl, "_blank");
    } catch (err) {
      console.error(err);
      const textEncoded = buildWaTextEncoded({ data, shortUrl: "" });
      const waUrl = `${base}&text=${textEncoded}`;
      if (waWin) waWin.location.href = waUrl;
      else window.open(waUrl, "_blank");
    }
  };

  const downloadInvoicePDF = async (data, tipo = "pedidos") => {
    const canvas = await renderInvoiceToCanvas(data, tipo);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 28;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, "", "FAST");

    try {
      const host = document.getElementById("invoice-offscreen");
      const a = host?.querySelector('a[data-ctype="company-wa"]');
      if (a) {
        const hostRect = host.getBoundingClientRect();
        const r = a.getBoundingClientRect();

        const relLeft = r.left - hostRect.left;
        const relTop = r.top - hostRect.top;

        const k = imgW / canvas.width;
        const PAD = 8;
        const x = margin + (relLeft - PAD) * k;
        const y = margin + (relTop - PAD / 2) * k;
        const w = (r.width + PAD * 2) * k;
        const h = (r.height + PAD) * k;

        const url = a.href || "https://wa.me/573172841355";
        pdf.link(x, y, Math.max(w, 60), Math.max(h, 16), { url });
      }
    } catch (e) {
      console.warn("No se pudo anotar link en PDF:", e);
    }

    const numero = data.numero || data.id || Date.now();
    pdf.save(`Pedido_${numero}.pdf`);
  };

  const shareWhatsAppTextOnly = (data) => {
    const text = buildInvoiceText(data);
    const phoneRaw = data?.cliente?.telefono || "";
    const digits = phoneRaw.replace(/\D/g, "");
    const msisdn = digits.startsWith("57") ? digits : `57${digits}`;
    const base = `https://api.whatsapp.com/send?phone=${msisdn}`;
    window.open(
      `${base}&text=${encodeURIComponent(text.normalize("NFC"))}`,
      "_blank"
    );
  };

  return (
    <div className="page-container">
      {/* Tabs */}
      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeModule === "clientes" ? "active" : ""}`}
            onClick={() => setActiveModule("clientes")}
          >
            <FaUsers /> Clientes
          </button>
          <button
            className={`tab ${activeModule === "plantillas" ? "active" : ""}`}
            onClick={() => setActiveModule("plantillas")}
          >
            <FaTemplate /> Plantillas de Factura
          </button>
          <button
            className={`tab ${activeModule === "pedidos" ? "active" : ""}`}
            onClick={() => setActiveModule("pedidos")}
          >
            <FaShoppingCart /> Pedidos
          </button>
        </div>
      </div>

      {/* CLIENTES */}
      {activeModule === "clientes" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FaUsers /> Gestión de Clientes
            </h2>
            <div className="actions-group" style={{ display: "flex", gap: 8 }}>
              <div className="search-box">
                <span className="search-icon">
                  <FaSearch />
                </span>
                <input
                  className="search-input"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingClient(null);
                  setClientForm({
                    nombre: "",
                    cedulaNit: "",
                    telefono: "",
                    direccion: "",
                    notas: "",
                    activo: true,
                  });
                  setShowClientModal(true);
                }}
              >
                <FaUserPlus /> Nuevo Cliente
              </button>
            </div>
          </div>

          {filteredClientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No hay clientes registrados</h3>
              <p>Comienza agregando tu primer cliente</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cédula/NIT</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <React.Fragment key={cliente.id}>
                    <tr>
                      <td className="client-name-cell">
                        <div className="client-name-wrapper centered">
                          <button
                            className="client-name-text"
                            title={cliente.nombre}
                            onClick={() =>
                              setExpandedClients((p) => ({
                                ...p,
                                [cliente.id]: !p[cliente.id],
                              }))
                            }
                          >
                            {cliente.nombre}
                          </button>
                          <div
                            className={`expand-icon ${
                              expandedClients[cliente.id] ? "expanded" : ""
                            }`}
                            onClick={() =>
                              setExpandedClients((p) => ({
                                ...p,
                                [cliente.id]: !p[cliente.id],
                              }))
                            }
                          >
                            {expandedClients[cliente.id] ? (
                              <FaChevronUp />
                            ) : (
                              <FaChevronDown />
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{cliente.cedulaNit || "-"}</td>
                      <td>{cliente.telefono || "-"}</td>
                      <td>{cliente.direccion || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            cliente.activo ? "badge-success" : "badge-danger"
                          }`}
                        >
                          {cliente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="actions-group"
                          style={{ display: "flex", gap: 8 }}
                        >
                          <button
                            className="btn btn-sm btn-secondary icon-btn"
                            onClick={() => {
                              setEditingClient(cliente);
                              setClientForm(cliente);
                              setShowClientModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary icon-btn"
                            onClick={() => handleToggleClientActive(cliente.id)}
                          >
                            {cliente.activo ? "🚫" : "✓"}
                          </button>
                          <button
                            className="btn btn-sm btn-danger icon-btn"
                            onClick={() => handleDeleteClient(cliente.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedClients[cliente.id] && (
                      <tr>
                        <td
                          colSpan="6"
                          style={{ background: "#f9fafb", padding: 20 }}
                        >
                          <div>
                            <h4
                              style={{
                                marginBottom: 16,
                                color: "var(--primary)",
                              }}
                            >
                              Facturas Asociadas
                            </h4>

                            <div className="grid grid-3" style={{ gap: 20 }}>
                              <div className="card" style={{ padding: 16 }}>
                                <h5 style={{ marginBottom: 12 }}>📦 Pedidos</h5>
                                {pedidos
                                  .filter((p) => p.clienteId === cliente.id)
                                  .map((pedido) => (
                                    <div
                                      key={pedido.id}
                                      style={{
                                        padding: 8,
                                        marginBottom: 8,
                                        background: "#fff",
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        fontWeight: 600,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <span>
                                          <strong>
                                            {pedido.numero || pedido.id}
                                          </strong>
                                        </span>
                                        <span
                                          className={`badge badge-${
                                            pedido.estado === "pagado"
                                              ? "success"
                                              : pedido.estado === "entregado"
                                              ? "warning"
                                              : "danger"
                                          }`}
                                        >
                                          {pedido.estado}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 14,
                                          color: "#6b7280",
                                          marginTop: 4,
                                        }}
                                      >
                                        <div>
                                          Total: $
                                          {pedido.total?.toLocaleString()}
                                        </div>
                                        <div>
                                          Saldo: $
                                          {pedido.saldo?.toLocaleString()}
                                        </div>
                                      </div>
                                      <button
                                        className="btn btn-sm btn-primary"
                                        style={{ marginTop: 8 }}
                                        onClick={() =>
                                          verDetallePedido(pedido, cliente)
                                        }
                                      >
                                        <FaEye /> Ver Detalle
                                      </button>
                                    </div>
                                  ))}
                                {pedidos.filter(
                                  (p) => p.clienteId === cliente.id
                                ).length === 0 && (
                                  <p style={{ color: "#9ca3af", fontSize: 14 }}>
                                    Sin pedidos
                                  </p>
                                )}
                              </div>

                              <div className="card" style={{ padding: 16 }}>
                                <h5 style={{ marginBottom: 12 }}>💰 Ventas</h5>

                                {(() => {
                                  const ventasDeCliente = ventas.filter(
                                    (v) => v.clienteId === cliente.id
                                  );
                                  const ventasAgrupadas =
                                    agruparVentasPorNumero(ventasDeCliente);

                                  if (ventasAgrupadas.length === 0) {
                                    return (
                                      <p
                                        style={{
                                          color: "#9ca3af",
                                          fontSize: 14,
                                        }}
                                      >
                                        Sin ventas registradas
                                      </p>
                                    );
                                  }

                                  return ventasAgrupadas.map((venta) => (
                                    <div
                                      key={venta.numero}
                                      style={{
                                        padding: 8,
                                        marginBottom: 8,
                                        background: "#fff",
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        fontWeight: 600,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <span>
                                          <strong>#{venta.numero}</strong>
                                        </span>
                                        {venta.estado && (
                                          <span
                                            className={`badge ${
                                              venta.estado === "pagado"
                                                ? "badge-success"
                                                : venta.estado === "pendiente"
                                                ? "badge-danger"
                                                : "badge-warning"
                                            }`}
                                          >
                                            {venta.estado}
                                          </span>
                                        )}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 14,
                                          color: "#6b7280",
                                          marginTop: 4,
                                        }}
                                      >
                                        <div>
                                          Fecha:{" "}
                                          {toDate(
                                            venta.createdAt
                                          ).toLocaleDateString("es-CO")}
                                        </div>
                                        <div>
                                          Total: $
                                          {Number(
                                            venta.total || 0
                                          ).toLocaleString("es-CO")}
                                        </div>
                                      </div>

                                      <button
                                        className="btn btn-sm btn-primary"
                                        style={{ marginTop: 8 }}
                                        onClick={() => {
                                          // <-- función local SIN hooks: arma los items con los nombres esperados por InvoicePreview
                                          const mapVentaItems = (v) => {
                                            // Soporta varias formas: v.items (nuevo), v.detalle / v.lineas (si existieron),
                                            // o un doc antiguo de 1 ítem (usamos el propio v como item).
                                            const src =
                                              Array.isArray(v.items) &&
                                              v.items.length
                                                ? v.items
                                                : Array.isArray(v.detalle) &&
                                                  v.detalle.length
                                                ? v.detalle
                                                : Array.isArray(v.lineas) &&
                                                  v.lineas.length
                                                ? v.lineas
                                                : [v]; // fallback: documento antiguo de 1 producto

                                            return src.map((it) => {
                                              const cantidad =
                                                Number(
                                                  it.cantidad ?? v.cantidad ?? 0
                                                ) || 0;
                                              const unit =
                                                Number(
                                                  it.vrUnitario ??
                                                    it.precioUnit ??
                                                    it.precio ??
                                                    v.precio ??
                                                    0
                                                ) || 0;
                                              return {
                                                producto:
                                                  it.producto ??
                                                  it.prenda ??
                                                  it.descripcion ??
                                                  "",
                                                plantel:
                                                  it.plantel ??
                                                  it.colegio ??
                                                  "",
                                                talla: it.talla ?? "",
                                                cantidad,
                                                vrUnitario: unit,
                                                vrTotal:
                                                  Number(
                                                    it.vrTotal ??
                                                      it.totalFila ??
                                                      0
                                                  ) || cantidad * unit,
                                              };
                                            });
                                          };

                                          const items = mapVentaItems(venta);

                                          setShowInvoicePreview({
                                            tipo: "ventas",
                                            data: {
                                              ...venta,
                                              // aseguramos numero corto si existe
                                              numero:
                                                venta.numeroCorto ||
                                                venta.numero ||
                                                venta.id,
                                              items,
                                              // normaliza totales por si el doc no los trae
                                              total:
                                                Number(venta.total ?? 0) ||
                                                items.reduce(
                                                  (s, it) =>
                                                    s +
                                                    (Number(it.vrTotal) || 0),
                                                  0
                                                ),
                                              abono:
                                                Number(venta.abono ?? 0) || 0,
                                              saldo:
                                                Number(venta.saldo ?? 0) ||
                                                (Number(venta.total ?? 0) ||
                                                  items.reduce(
                                                    (s, it) =>
                                                      s +
                                                      (Number(it.vrTotal) || 0),
                                                    0
                                                  )) -
                                                  (Number(venta.abono ?? 0) ||
                                                    0),
                                            },
                                          });
                                        }}
                                      >
                                        <FaEye /> Ver Detalle
                                      </button>
                                    </div>
                                  ));
                                })()}
                              </div>

                              <div className="card" style={{ padding: 16 }}>
                                <h5 style={{ marginBottom: 12 }}>
                                  📋 Encargos
                                </h5>

                                {encargos
                                  .filter((e) => e.clienteId === cliente.id)
                                  .map((encargo) => (
                                    <div
                                      key={encargo.id}
                                      style={{
                                        padding: 8,
                                        marginBottom: 8,
                                        background: "#fff",
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        fontWeight: 600,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <span>
                                          <strong>
                                            #
                                            {encargo.codigoCorto ||
                                              encargo.numeroCorto ||
                                              encargo.numero ||
                                              encargo.id}
                                          </strong>
                                        </span>
                                        <span
                                          className={`badge ${
                                            encargo.estado === "pagado"
                                              ? "badge-success"
                                              : encargo.estado === "entregado"
                                              ? "badge-warning"
                                              : "badge-danger"
                                          }`}
                                        >
                                          {encargo.estado || "pendiente"}
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 14,
                                          color: "#6b7280",
                                          marginTop: 4,
                                        }}
                                      >
                                        <div>
                                          Fecha:{" "}
                                          {(
                                            parseFsDate(encargo.createdAt) ||
                                            parseFsDate(encargo.fecha) ||
                                            new Date()
                                          ).toLocaleDateString("es-CO")}
                                        </div>
                                        <div>
                                          Total: $
                                          {Number(
                                            encargo.total || 0
                                          ).toLocaleString()}{" "}
                                          · Abono: $
                                          {Number(
                                            encargo.abono || 0
                                          ).toLocaleString()}{" "}
                                          · Saldo: $
                                          {Number(
                                            encargo.saldo || 0
                                          ).toLocaleString()}
                                        </div>
                                      </div>

                                      <button
                                        className="btn btn-sm btn-primary"
                                        style={{ marginTop: 8 }}
                                        onClick={() => {
                                          // normaliza líneas (soporta 'items' nuevo o 'productos' antiguo)
                                          const src =
                                            Array.isArray(encargo.items) &&
                                            encargo.items.length
                                              ? encargo.items
                                              : encargo.productos || [];

                                          const items = src.map((i) => {
                                            const cantidad = Number(
                                              i.cantidad ?? 0
                                            );
                                            const unit = Number(
                                              i.vrUnitario ?? i.precio ?? 0
                                            );
                                            return {
                                              producto:
                                                i.producto ?? i.prenda ?? "",
                                              plantel:
                                                i.plantel ?? i.colegio ?? "",
                                              talla: i.talla ?? "",
                                              cantidad,
                                              vrUnitario: unit,
                                              vrTotal: Number(
                                                i.vrTotal ??
                                                  i.total ??
                                                  cantidad * unit
                                              ),
                                              // preserva estado de entrega por item
                                              entregado:
                                                i.entregado === true ||
                                                i.estadoEntrega === "entregado" ||
                                                i.delivery === true,
                                            };
                                          });

                                          const total =
                                            Number(encargo.total) ||
                                            items.reduce(
                                              (s, it) =>
                                                s + (Number(it.vrTotal) || 0),
                                              0
                                            );
                                          const abono = Number(
                                            encargo.abono || 0
                                          );
                                          const saldo =
                                            encargo.saldo ??
                                            Math.max(total - abono, 0);

                                          setShowInvoicePreview({
                                            tipo: "encargos",
                                            data: {
                                              ...encargo,
                                              // 👇 aquí forzamos el número corto en el encabezado del PDF/modal
                                              numero:
                                                encargo.codigoCorto ||
                                                encargo.numeroCorto ||
                                                encargo.numeroFactura ||
                                                encargo.numero ||
                                                encargo.id,
                                              createdAt: asISO(
                                                encargo.createdAt ||
                                                  encargo.fecha
                                              ),

                                              items,
                                              total,
                                              abono,
                                              saldo,
                                            },
                                          });
                                        }}
                                      >
                                        <FaEye /> Ver Detalle
                                      </button>
                                    </div>
                                  ))}

                                {encargos.filter(
                                  (e) => e.clienteId === cliente.id
                                ).length === 0 && (
                                  <p style={{ color: "#9ca3af", fontSize: 14 }}>
                                    Sin encargos registrados
                                  </p>
                                )}
                              </div>
                            </div>

                            {cliente.notas && (
                              <div
                                style={{
                                  marginTop: 16,
                                  padding: 12,
                                  background: "#fef3c7",
                                  borderRadius: 8,
                                }}
                              >
                                <strong>Notas:</strong> {cliente.notas}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PLANTILLAS */}
      {activeModule === "plantillas" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FaTemplate /> Plantillas de Factura
            </h2>
          </div>

          <div className="grid grid-3">
            {["ventas", "encargos", "pedidos"].map((tipo) => {
              const template = plantillas[tipo] || defaultTemplates[tipo];
              return (
                <div key={tipo} className="card">
                  <h3 style={{ marginBottom: 16, textTransform: "capitalize" }}>
                    Plantilla de {tipo}
                  </h3>
                  <div style={{ marginBottom: 16 }}>
                    <img
                      src={template?.logoUrl}
                      alt="Logo"
                      style={{
                        maxWidth: "100%",
                        height: 80,
                        objectFit: "contain",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 8,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>
                      Campos Visibles:
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {template?.camposVisibles &&
                        Object.entries(template.camposVisibles).map(
                          ([campo, visible]) => (
                            <span
                              key={campo}
                              className={`badge ${
                                visible ? "badge-success" : "badge-danger"
                              }`}
                            >
                              {campo}
                            </span>
                          )
                        )}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => openTemplateEditor(tipo)}
                  >
                    <FaEdit /> Editar Plantilla
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PEDIDOS */}
      {activeModule === "pedidos" && (
        <>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <FaPlus /> Nuevo Pedido
              </h2>
            </div>

            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select
                className="form-select"
                value={pedidoForm.clienteId}
                onChange={(e) =>
                  setPedidoForm((f) => ({ ...f, clienteId: e.target.value }))
                }
              >
                <option value="">Seleccionar cliente...</option>
                {clientes
                  .filter((c) => c.activo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} - {c.telefono}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 12 }}>Productos</h3>
              {pedidoForm.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="grid grid-3" style={{ marginBottom: 8 }}>
                    <div className="form-group">
                      <label className="form-label">Plantel</label>
                      <select
                        className="form-select"
                        value={item.plantel}
                        onChange={(e) =>
                          handleItemChange(idx, "plantel", e.target.value)
                        }
                      >
                        <option value="">Seleccionar...</option>
                        {plantelesAll.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Producto</label>
                      <select
                        className="form-select"
                        value={item.producto}
                        onChange={(e) =>
                          handleItemChange(idx, "producto", e.target.value)
                        }
                      >
                        <option value="">Seleccionar...</option>
                        {item.plantel &&
                          Object.keys(
                            catalogIndex.byColegio[item.plantel] || {}
                          )
                            .sort()
                            .map((pr) => (
                              <option key={pr} value={pr}>
                                {pr}
                              </option>
                            ))}
                      </select>
                      {item.plantel && item.producto && item.talla && (
                        <small
                          style={{
                            color: "#6b7280",
                            display: "block",
                            marginTop: 6,
                          }}
                        >
                          Precio sugerido: $
                          {(
                            (
                              catalogIndex.byColegio[item.plantel]?.[
                                item.producto
                              ] || []
                            ).find((x) => x.talla === item.talla)?.precio || 0
                          ).toLocaleString()}
                        </small>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Talla</label>
                      <select
                        className="form-select"
                        value={item.talla}
                        onChange={(e) => {
                          const talla = e.target.value;
                          handleItemChange(idx, "talla", talla);
                          const precio = getPrecioFromCatalog(
                            item.plantel,
                            item.producto,
                            talla
                          );
                          if (precio > 0) {
                            handleItemChange(idx, "vrUnitario", String(precio));
                          }
                        }}
                        disabled={!item.plantel || !item.producto}
                      >
                        <option value="">Seleccionar...</option>
                        {item.plantel &&
                          item.producto &&
                          (
                            catalogIndex.byColegio[item.plantel]?.[
                              item.producto
                            ] || []
                          ).map(({ talla }) => (
                            <option key={talla} value={talla}>
                              {talla}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-3">
                    <div className="form-group">
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleItemChange(idx, "cantidad", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vr. Unitario</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        value={item.vrUnitario}
                        onChange={(e) =>
                          handleItemChange(idx, "vrUnitario", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vr. Total</label>
                      <input
                        type="text"
                        className="form-input"
                        readOnly
                        value={`${(item.vrTotal || 0).toLocaleString()}`}
                        style={{ background: "#f3f4f6" }}
                      />
                    </div>
                  </div>

                  {pedidoForm.items.length > 1 && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemoveItemPedido(idx)}
                    >
                      <FaMinus /> Eliminar fila
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn btn-secondary"
                onClick={handleAddItemPedido}
              >
                <FaPlus /> Agregar producto
              </button>
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Total</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={`${calculatePedidoTotal().toLocaleString()}`}
                  style={{ background: "#f3f4f6", fontWeight: 600 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Abono</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={pedidoForm.abono}
                  onChange={(e) =>
                    setPedidoForm((f) => ({ ...f, abono: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Saldo</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={`${(
                    calculatePedidoTotal() - (parseFloat(pedidoForm.abono) || 0)
                  ).toLocaleString()}`}
                  style={{ background: "#f3f4f6", fontWeight: 600 }}
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={pedidoForm.estado}
                  onChange={(e) =>
                    setPedidoForm((f) => ({ ...f, estado: e.target.value }))
                  }
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="entregado">Entregado</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={pedidoForm.observaciones}
                  onChange={(e) =>
                    setPedidoForm((f) => ({
                      ...f,
                      observaciones: e.target.value,
                    }))
                  }
                  placeholder="Notas adicionales del pedido"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleSavePedido}
                style={{ flex: 1 }}
              >
                <FaSave />{" "}
                {editingPedidoId ? "Actualizar Pedido" : "Guardar Pedido"}
              </button>

              {editingPedidoId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingPedidoId(null);
                    setEditingPedidoNumero(null);
                    setEditingPedidoCreatedAt(null);
                    // Dejar el form limpio
                    setPedidoForm({
                      clienteId: "",
                      observaciones: "",
                      abono: 0,
                      estado: "pendiente",
                      items: [
                        {
                          producto: "",
                          plantel: "",
                          talla: "",
                          cantidad: 1,
                          vrUnitario: 0,
                          vrTotal: 0,
                        },
                      ],
                    });
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </div>

          {/* Tabla pedidos */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <FaShoppingCart /> Lista de Pedidos
              </h2>
              <div className="search-box">
                <span className="search-icon">
                  <FaSearch />
                </span>
                <input
                  className="search-input"
                  placeholder="Buscar pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredPedidos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                <h3>No hay pedidos registrados</h3>
                <p>Crea tu primer pedido usando el formulario superior</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nº Pedido</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Abono</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map((pedido) => (
                    <tr key={pedido.id}>
                      <td style={{ fontWeight: 600, color: "var(--primary)" }}>
                        {pedido.numero || pedido.id}
                      </td>
                      <td>{pedido.clienteNombre}</td>
                      <td>{new Date(pedido.createdAt).toLocaleDateString()}</td>
                      <td>${pedido.total?.toLocaleString()}</td>
                      <td>${pedido.abono?.toLocaleString()}</td>
                      <td>${pedido.saldo?.toLocaleString()}</td>
                      <td className="status-cell">
                        <label
                          htmlFor={`estado-${pedido.id}`}
                          className="sr-only"
                        >
                          Estado del pedido
                        </label>
                        <select
                          id={`estado-${pedido.id}`}
                          className="status-emoji"
                          value={pedido.estado}
                          onChange={(e) =>
                            updatePedidoEstado(pedido.id, e.target.value)
                          }
                          title="Cambiar estado"
                        >
                          {PEDIDO_ESTADOS.map((st) => (
                            <option key={st} value={st}>
                              {labelEstado(st)}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <div
                          className="actions-group pedido-actions"
                          style={{ display: "flex", gap: 8 }}
                        >
                          <button
                            className="btn btn-sm btn-primary icon-btn"
                            onClick={() => {
                              const cli = clientes.find((c) => c.id === pedido.clienteId);
                              verDetallePedido(pedido, cli);
                            }}
                            title="Ver"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary icon-btn"
                            onClick={() => {
                              const clienteData = clientes.find(
                                (c) => c.id === pedido.clienteId
                              );
                              downloadInvoicePDF(
                                { ...pedido, cliente: clienteData },
                                "pedidos"
                              );
                            }}
                            title="PDF"
                          >
                            <FaFilePdf />
                          </button>

                          <button
                            className="btn btn-sm btn-success icon-btn"
                            onClick={() => {
                              const clienteData = clientes.find(
                                (c) => c.id === pedido.clienteId
                              );
                              shareWhatsAppViaDiscord(
                                { ...pedido, cliente: clienteData },
                                "pedidos"
                              );
                            }}
                            title="WhatsApp"
                          >
                            <FaWhatsapp />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary icon-btn"
                            onClick={() => startEditPedido(pedido)}
                            title="Editar pedido"
                          >
                            <FaEdit />
                          </button>

                          <button
                            className="btn btn-sm btn-danger icon-btn"
                            onClick={() =>
                              handleDeletePedido(pedido.id, pedido.numero)
                            }
                            title="Eliminar pedido"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODALES */}
      <ClientModal
        open={showClientModal}
        editingClient={editingClient}
        clientForm={clientForm}
        setClientForm={setClientForm}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
      />

      {showTemplateEditor && editingTemplate && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Editar Plantilla de {editingTemplate.tipo}</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowTemplateEditor(false);
                  setEditingTemplate(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">URL del Logo</label>
                <input
                  className="form-input"
                  value={editingTemplate.data.logoUrl || ""}
                  onChange={(e) =>
                    setEditingTemplate((et) => ({
                      ...et,
                      data: { ...et.data, logoUrl: e.target.value },
                    }))
                  }
                  placeholder="https://tu-logo.png"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Texto de Encabezado</label>
                <input
                  className="form-input"
                  value={editingTemplate.data.headerText || ""}
                  onChange={(e) =>
                    setEditingTemplate((et) => ({
                      ...et,
                      data: { ...et.data, headerText: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Campos Visibles</label>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {Object.entries(
                    editingTemplate.data.camposVisibles || {}
                  ).map(([campo, visible]) => (
                    <label
                      key={campo}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() =>
                          setEditingTemplate((et) => ({
                            ...et,
                            data: {
                              ...et.data,
                              camposVisibles: {
                                ...et.data.camposVisibles,
                                [campo]: !visible,
                              },
                            },
                          }))
                        }
                      />
                      <span style={{ textTransform: "capitalize" }}>
                        {campo}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Texto de Pie de Página</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={editingTemplate.data.footerText || ""}
                  onChange={(e) =>
                    setEditingTemplate((et) => ({
                      ...et,
                      data: { ...et.data, footerText: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowTemplateEditor(false);
                  setEditingTemplate(null);
                }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveTemplate}>
                <FaSave /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render offscreen para generar PDF/PNG sin abrir modal */}
      <div
        id="invoice-offscreen"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px",
          background: "#fff",
          padding: "24px",
        }}
      >
        {offscreenInvoice && (
          <InvoicePreview
            template={plantillas[offscreenInvoice.tipo] || plantillas.pedidos}
            data={offscreenInvoice.data}
          />
        )}
      </div>

      {showInvoicePreview && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2>Vista Previa de Factura</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowInvoicePreview(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div id={INVOICE_HOST_ID}>
                <InvoicePreview
                  template={
                    plantillas[showInvoicePreview.tipo] ||
                    defaultTemplates[showInvoicePreview.tipo]
                  }
                  data={showInvoicePreview.data}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() =>
                  downloadInvoicePDF(
                    showInvoicePreview.data,
                    showInvoicePreview.tipo
                  )
                }
              >
                <FaFilePdf /> Descargar PDF
              </button>

              <button
                className="btn btn-success"
                onClick={() =>
                  shareWhatsAppViaDiscord(
                    showInvoicePreview.data,
                    showInvoicePreview.tipo
                  )
                }
              >
                <FaWhatsapp /> Enviar por WhatsApp
              </button>

              <button
                className="btn btn-secondary"
                onClick={() =>
                  downloadInvoicePDF(
                    showInvoicePreview.data,
                    showInvoicePreview.tipo
                  )
                }
              >
                <FaPrint /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
