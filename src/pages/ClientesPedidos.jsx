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
} from "firebase/firestore";

import "../styles/sistema-completo.css";
import ClientModal from "../components/clients/ClientModal";
import InvoicePreview from "../components/invoices/InvoicePreview";

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
  const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || ""; // o pega directo el URL si no usarás .env

  // Datos
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [plantillas, setPlantillas] = useState({
    ventas: null,
    encargos: null,
    pedidos: null,
  });
  // === Consecutivo seguro 4 dígitos para pedidos ===
  const getNextPedidoConsecutivo = async () => {
    const ref = doc(db, "counters", "pedidos");
    const next = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        // primera vez
        tx.set(ref, { value: 1 });
        return 1;
      }
      const current = Number(snap.data().value) || 0;
      const n = current + 1;
      tx.update(ref, { value: n });
      return n;
    });
    return String(next).padStart(4, "0"); // "0001", "0002", ...
  };

  // ===== Helper: precio por Plantel + Producto + Talla =====
  const getPrecioFromCatalog = (plantel, producto, talla) => {
    const arr = catalogIndex.byColegio?.[plantel]?.[producto] || [];
    const m = arr.find((x) => (x.talla || "").trim() === (talla || "").trim());
    // Asegura número
    return m ? Number(m.precio) || 0 : 0;
  };

  // ====== WhatsApp & PDF/Print ======
  const INVOICE_HOST_ID = "invoice-print-host";

  // Texto plano legible para WhatsApp
  // Texto legible para WhatsApp / fallback

  // Abre una ventana con SOLO el contenido del preview y lanza print()
  // El usuario podrá "Guardar como PDF" desde el diálogo de impresión.
  const handleDownloadPDF = () => {
    const node = document.getElementById(INVOICE_HOST_ID);
    if (!node) return;

    // Copiamos estilos actuales (style y link stylesheet)
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

  // Arma mensaje de WhatsApp; si el cliente tiene teléfono, abre chat directo
  const handleShareWhatsApp = () => {
    const data = showInvoicePreview?.data;
    if (!data) return;
    const text = buildInvoiceText(data);
    const phoneRaw = data?.cliente?.telefono || "";
    const digits = phoneRaw.replace(/\D/g, "");

    const base =
      digits.length >= 8 ? `https://wa.me/${digits}` : `https://wa.me/`;
    const url = `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Botón "Imprimir" puede reutilizar el flujo PDF/print
  const handlePrint = () => handleDownloadPDF();
  // ===== Catálogo dinámico desde Firestore (productos_catalogo) =====
  const [catalogoDocs, setCatalogoDocs] = useState([]);
  const [plantelesAll, setPlantelesAll] = useState([]); // colegios
  const [catalogIndex, setCatalogIndex] = useState({
    byColegio: {}, // colegio -> prenda -> [{talla, precio}]
  });
  const ordenTallas = [
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

  // Suscripciones Firestore (realtime)
  useEffect(() => {
    const qClientes = query(
      collection(db, "clientes"),
      orderBy("fechaCreacion", "asc")
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

    // invoice_templates como 3 docs: ventas / encargos / pedidos
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
      unsubTemplates.forEach((u) => u());
    };
  }, []);

  // Cargar catálogo real y construir índice (plantel->producto->tallas)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos_catalogo"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCatalogoDocs(docs);
      // byColegio
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
      // ordenar tallas por ordenTallas
      Object.keys(idx).forEach((col) => {
        Object.keys(idx[col]).forEach((pr) => {
          idx[col][pr].sort((a, b) => {
            const ia = ordenTallas.indexOf(a.talla);
            const ib = ordenTallas.indexOf(b.talla);
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

    // 1) obtener consecutivo 0001, 0002, ...
    const numero = await getNextPedidoConsecutivo();

    const payload = {
      clienteId: pedidoForm.clienteId,
      clienteNombre: cliente?.nombre || "",
      items: pedidoForm.items.filter((i) => i.producto && i.vrTotal > 0),
      total,
      abono: parseFloat(pedidoForm.abono) || 0,
      saldo: total - (parseFloat(pedidoForm.abono) || 0),
      estado: pedidoForm.estado,
      observaciones: pedidoForm.observaciones,
      createdAt: new Date().toISOString(),
      numero, // 👈 nuevo campo
    };

    const ref = await addDoc(collection(db, "pedidos"), payload);

    // reset
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

    alert(`Pedido ${numero} guardado`);
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

  // Filtros/búsqueda (cliente-side)
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

  // ---- Utilidades comunes ----
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  const renderInvoiceToCanvas = async (data, tipo = "pedidos") => {
    // 1) renderizamos el preview fuera de pantalla
    setOffscreenInvoice({ tipo, data });
    await pause(60); // da tiempo al render
    const host = document.getElementById("invoice-offscreen");
    // 2) capturamos a canvas
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#fff",
      useCORS: true,
      logging: false,
    });
    // 3) limpiamos
    setOffscreenInvoice(null);
    return canvas;
  };

  /** Genera el PDF en memoria como Blob y anota el link de WhatsApp */
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

    // 🔗 Hotspot inflado (igual que en downloadInvoicePDF)
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

  /** Sube el PDF al canal de Discord vía webhook y devuelve el URL público del archivo */
  const uploadPdfToDiscord = async (blob, filename) => {
    if (!DISCORD_WEBHOOK_URL) throw new Error("Falta VITE_DISCORD_WEBHOOK_URL");

    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("payload_json", JSON.stringify({ content: "" })); // mensaje vacío

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

  /** Texto legible (fallback por si falla Discord) */
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

  /** WhatsApp ➜ genera PDF ➜ sube a Discord ➜ abre chat con link al PDF */
  const shareWhatsAppViaDiscord = async (data, tipo = "pedidos") => {
    // Abrimos la ventana primero para que el navegador no bloquee el popup
    const waWin = window.open("about:blank", "_blank");

    try {
      const numero = data.numero || data.id || Date.now();
      const blob = await buildInvoicePdfBlob(data, tipo);
      const fileUrl = await uploadPdfToDiscord(blob, `Pedido_${numero}.pdf`);

      const phoneRaw = data?.cliente?.telefono || "";
      const digits = phoneRaw.replace(/\D/g, "");
      const base =
        digits.length >= 8 ? `https://wa.me/${digits}` : `https://wa.me/`;
      const text = `Pedido ${numero}\n${fileUrl}`;
      const waUrl = `${base}?text=${encodeURIComponent(text)}`;

      if (waWin) waWin.location.href = waUrl;
      else window.open(waUrl, "_blank");
    } catch (err) {
      console.error(err);
      // Fallback: texto plano si falló la subida
      const text = buildInvoiceText(data);
      const phoneRaw = data?.cliente?.telefono || "";
      const digits = phoneRaw.replace(/\D/g, "");
      const base =
        digits.length >= 8 ? `https://wa.me/${digits}` : `https://wa.me/`;
      const waUrl = `${base}?text=${encodeURIComponent(text)}`;
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

    // 🔗 Hotspot clicable sobre el número de WhatsApp
    try {
      const host = document.getElementById("invoice-offscreen");
      const a = host?.querySelector('a[data-ctype="company-wa"]');
      if (a) {
        const hostRect = host.getBoundingClientRect();
        const r = a.getBoundingClientRect();

        // Coordenadas relativas dentro del host
        const relLeft = r.left - hostRect.left;
        const relTop = r.top - hostRect.top;

        // Escala de px (canvas) -> pt (PDF) (horizontal/vertical iguales)
        const k = imgW / canvas.width;
        // Padding adicional en px (DOM)
        const PAD = 8;
        const x = margin + (relLeft - PAD) * k;
        const y = margin + (relTop - PAD / 2) * k;
        const w = (r.width + PAD * 2) * k;
        const h = (r.height + PAD) * k;

        const url = a.href || "https://wa.me/573172841355";
        pdf.link(x, y, Math.max(w, 60), Math.max(h, 16), { url }); // 👈 mínimos razonables
      }
    } catch (e) {
      // Si algo falla, solo seguimos sin link clicable
      console.warn("No se pudo anotar link en PDF:", e);
    }

    const numero = data.numero || data.id || Date.now();
    pdf.save(`Pedido_${numero}.pdf`);
  };

  // Texto legible (si decides no subir archivo)
  //   const buildInvoiceText = (data) => {
  //     const numero = data.numero || data.id || "";
  //     const fecha = new Date(data.createdAt || Date.now()).toLocaleDateString();
  //     const cli = data.cliente
  //       ? `Cliente: ${data.cliente.nombre} (${data.cliente.telefono || "-"})`
  //       : "";
  //     const items = (data.items || [])
  //       .map(
  //         (it) =>
  //           `• ${it.cantidad} x ${it.producto}${
  //             it.talla ? ` Talla ${it.talla}` : ""
  //           }${it.plantel ? ` - ${it.plantel}` : ""} = $${(
  //             it.vrTotal || 0
  //           ).toLocaleString()}`
  //       )
  //       .join("\n");
  //     const tot = `Total: $${(data.total || 0).toLocaleString()}   Abono: $${(
  //       data.abono || 0
  //     ).toLocaleString()}   Saldo: $${(data.saldo || 0).toLocaleString()}`;
  //     const obs = data.observaciones ? `Obs: ${data.observaciones}` : "";
  //     return [`PEDIDO ${numero} - ${fecha}`, cli, items, tot, obs]
  //       .filter(Boolean)
  //       .join("\n");
  //   };

  // (OPCIONAL) Subir PNG a Storage y compartir el link por WhatsApp
  const shareWhatsAppWithImageLink = async (data, tipo = "pedidos") => {
    const canvas = await renderInvoiceToCanvas(data, tipo);
    const pngDataURL = canvas.toDataURL("image/png"); // base64
    const numero = data.numero || data.id || Date.now();
    const path = `invoices/Pedido_${numero}.png`;
    const ref = sRef(storage, path);
    await uploadString(ref, pngDataURL, "data_url");
    const publicURL = await getDownloadURL(ref);

    const text = `Pedido ${numero}\n${publicURL}`;
    const phoneRaw = data?.cliente?.telefono || "";
    const digits = phoneRaw.replace(/\D/g, "");
    const base =
      digits.length >= 8 ? `https://wa.me/${digits}` : `https://wa.me/`;
    window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // (POR DEFECTO) Solo mensaje de texto sin archivo
  const shareWhatsAppTextOnly = (data) => {
    const text = buildInvoiceText(data);
    const phoneRaw = data?.cliente?.telefono || "";
    const digits = phoneRaw.replace(/\D/g, "");
    const base =
      digits.length >= 8 ? `https://wa.me/${digits}` : `https://wa.me/`;
    window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank");
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
                      <td>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
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
                          )}{" "}
                          {cliente.nombre}
                        </button>
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
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingClient(cliente);
                              setClientForm(cliente);
                              setShowClientModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleToggleClientActive(cliente.id)}
                          >
                            {cliente.activo ? "🚫" : "✓"}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
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
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <span>
                                          <strong>{pedido.id}</strong>
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
                                        onClick={() => {
                                          setShowInvoicePreview({
                                            tipo: "pedidos",
                                            data: { ...pedido, cliente },
                                          });
                                        }}
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
                                <p style={{ color: "#9ca3af", fontSize: 14 }}>
                                  Sin ventas registradas
                                </p>
                              </div>

                              <div className="card" style={{ padding: 16 }}>
                                <h5 style={{ marginBottom: 12 }}>
                                  📋 Encargos
                                </h5>
                                <p style={{ color: "#9ca3af", fontSize: 14 }}>
                                  Sin encargos registrados
                                </p>
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
                          // 1) fija talla
                          handleItemChange(idx, "talla", talla);
                          // 2) busca precio en catálogo y autollenA vrUnitario
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

            <button
              className="btn btn-primary"
              onClick={handleSavePedido}
              style={{ width: "100%" }}
            >
              <FaSave /> Guardar Pedido
            </button>
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
                      <td>
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
                      </td>
                      <td>
                        <div
                          className="actions-group"
                          style={{ display: "flex", gap: 8 }}
                        >
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              const cli = clientes.find(
                                (c) => c.id === pedido.clienteId
                              );
                              setShowInvoicePreview({
                                tipo: "pedidos",
                                data: { ...pedido, cliente: cli },
                              });
                            }}
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              const clienteData = clientes.find(
                                (c) => c.id === pedido.clienteId
                              );
                              downloadInvoicePDF(
                                { ...pedido, cliente: clienteData },
                                "pedidos"
                              );
                            }}
                          >
                            <FaFilePdf />
                          </button>

                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              const clienteData = clientes.find(
                                (c) => c.id === pedido.clienteId
                              );
                              shareWhatsAppViaDiscord(
                                { ...pedido, cliente: clienteData },
                                "pedidos"
                              );
                            }}
                          >
                            <FaWhatsapp />
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
          width: "794px", // ~A4 a 96 dpi
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
              {/* IMPORTANTE: este ID lo usa handleDownloadPDF */}
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
