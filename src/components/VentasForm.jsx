import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ClienteComboBox from "./ClienteComboBox";

const VentasForm = ({ productoEscaneado, onAgregar, onAgregarEncargo }) => {
  const [venta, setVenta] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
    cantidad: 1,
    metodoPago: "efectivo",
    estado: "venta",
    abono: 0,
    saldo: 0,
  });

  // NUEVO: Estado para cliente seleccionado
  const [selectedCliente, setSelectedCliente] = useState(null);
  // Abono global para TODO el carrito cuando es encargo/separado
  const [abonoCarrito, setAbonoCarrito] = useState(0);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [catalogos, setCatalogos] = useState({
    colegios: [],
    prendas: [],
    tallas: [],
  });
  const [carrito, setCarrito] = useState([]);
  const [mostrarFormularioEncargo, setMostrarFormularioEncargo] =
    useState(false);
  // Datos del cliente del encargo (NO SE LIMPIAN AL AGREGAR AL CARRITO)
  const [datosEncargo, setDatosEncargo] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    documento: "",
    formaPago: "",
    abono: 0,
    saldo: 0,
  });

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      const [stockSnap, catalogSnap] = await Promise.all([
        getDocs(collection(db, "stock_actual")),
        getDocs(collection(db, "productos_catalogo")),
      ]);

      setProductosDisponibles(
        stockSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      const catalogData = catalogSnap.docs.map((doc) => doc.data());

      // Orden personalizado para tallas
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
      const tallasUnicas = [...new Set(catalogData.map((p) => p.talla))];
      const tallasOrdenadas = tallasUnicas
        .sort((a, b) => ordenTallas.indexOf(a) - ordenTallas.indexOf(b))
        .filter((t) => t);

      setCatalogos({
        colegios: [...new Set(catalogData.map((p) => p.colegio))].sort(),
        prendas: [...new Set(catalogData.map((p) => p.prenda))].sort(),
        tallas: tallasOrdenadas,
      });
    };
    cargarDatos();
  }, []);

  // Autocompletar con QR
  useEffect(() => {
    if (productoEscaneado) {
      setVenta((prev) => ({
        ...prev,
        colegio: productoEscaneado.colegio,
        prenda: productoEscaneado.prenda,
        talla: productoEscaneado.talla,
        precio: productoEscaneado.precio,
      }));
    }
  }, [productoEscaneado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVenta((prev) => {
      const updatedVenta = { ...prev, [name]: value };

      if (name === "abono") {
        const total = updatedVenta.cantidad * (updatedVenta.precio || 0);
        return { ...updatedVenta, saldo: total - parseFloat(value || 0) };
      }
      return updatedVenta;
    });
  };

  // Handler para el modal de encargo
  const handleChangeEncargo = (e) => {
    const { name, value } = e.target;
    setDatosEncargo((prev) => ({ ...prev, [name]: value }));
  };

  const agregarAlCarrito = () => {
    // Validar
    const camposRequeridos = [
      "colegio",
      "prenda",
      "talla",
      "precio",
      "cantidad",
    ];
    const camposFaltantes = camposRequeridos.filter((campo) => !venta[campo]);
    if (camposFaltantes.length > 0) {
      alert(`Faltan campos requeridos: ${camposFaltantes.join(", ")}`);
      return;
    }

    const totalItem = Number(venta.precio) * Number(venta.cantidad);
    const abono =
      venta.estado === "separado" || venta.estado === "encargo"
        ? Number(venta.abono) || 0
        : 0;
    const saldo =
      venta.estado === "separado" || venta.estado === "encargo"
        ? totalItem - abono
        : 0;

    const nuevoItem = {
      colegio: venta.colegio.trim(),
      prenda: venta.prenda.trim(),
      talla: venta.talla.trim(),
      precio: Number(venta.precio),
      cantidad: Number(venta.cantidad),
      metodoPago: venta.metodoPago,
      estado: venta.estado,
      total: totalItem,
      abono,
      saldo,
      id: Date.now(),
      entregado: true,
      // NUEVO: incluir información del cliente si está seleccionado
      clienteId: selectedCliente?.id || null,
      clienteResumen: selectedCliente
        ? {
            nombre: selectedCliente.nombre,
            telefono: selectedCliente.telefono,
            documento: selectedCliente.documento,
          }
        : null,
    };

    setCarrito([...carrito, nuevoItem]);

    // Limpiar SOLO producto, NO datos del cliente
    setVenta((prev) => ({
      ...prev,
      colegio: "",
      prenda: "",
      talla: "",
      precio: "",
      cantidad: 1,
      abono: 0,
      saldo: 0,
    }));
  };

  // Eliminar del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const togglePendienteEntrega = (id) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, entregado: !item.entregado } : item
      )
    );
  };

  // Cuando seleccionan "encargo", muestra el modal después del chequeo
  const registrarVenta = async () => {
    // Validaciones mínimas
    if (carrito.length === 0) {
      alert("Agrega al menos un producto al carrito.");
      return;
    }

    // ===== Encargo =====
    if (venta.estado === "encargo") {
      // si YA hay cliente seleccionado, NO mostrar el modal
      if (selectedCliente) {
        // ✅ usar el abono y totales del CARRITO (no los del primer ítem)
        const total = carrito.reduce(
          (acc, it) =>
            acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 0),
          0
        );
        const abonoItems = carrito.reduce(
          (acc, it) => acc + (Number(it.abono) || 0),
          0
        );
        const abonoGlobal = Number(abonoCarrito) || 0;
        const abono = abonoItems + abonoGlobal; // lo que realmente se ha abonado (items + global)
        const saldo = Math.max(total - abono, 0); // saldo real

        const encargo = {
          createdAt: new Date().toISOString(),
          estado: "pendiente",
          clienteId: selectedCliente.id,
          clienteResumen: {
            nombre: selectedCliente.nombre,
            telefono: selectedCliente.telefono,
            documento: selectedCliente.documento,
            direccion: selectedCliente.direccion || "",
          },
          items: carrito.map((i) => ({
            producto: i.prenda || i.producto || "",
            plantel: i.colegio || i.plantel || "",
            talla: i.talla || "",
            cantidad: Number(i.cantidad) || 0,
            vrUnitario: Number(i.precio) || 0,
            vrTotal: (Number(i.precio) || 0) * (Number(i.cantidad) || 0),
            entregado: !!i.entregado, // <— clave para la badge
          })),
          total,
          abono,
          saldo,
          metodoPago: venta.metodoPago || "efectivo",
        };

        const ok = await onAgregarEncargo(encargo);
        if (ok) {
          setCarrito([]);
          setSelectedCliente(null);
          setAbonoCarrito(0); // reset del abono global
        }
        return; // <- MUY IMPORTANTE: No sigas a mostrar el modal
      }

      // si NO hay cliente seleccionado, se deja el modal como fallback
      setDatosEncargo((prev) => ({
        ...prev,
        abono: Number(abonoCarrito) || 0,
      }));
      setMostrarFormularioEncargo(true);
      return;
    }

    // ===== Venta normal =====
    const carritoConCliente = carrito.map((i) => ({
      ...i,
      clienteId: selectedCliente?.id ?? i.clienteId ?? null,
      clienteResumen: selectedCliente
        ? {
            nombre: selectedCliente.nombre,
            telefono: selectedCliente.telefono,
            documento: selectedCliente.documento,
          }
        : i.clienteResumen ?? null,
    }));

    const exito = await onAgregar(carritoConCliente);
    if (exito) {
      setCarrito([]);
      setSelectedCliente(null);
    }
  };

  // Registrar el encargo correctamente (modal fallback)
  const registrarEncargo = async () => {
    if (
      !datosEncargo.nombre ||
      !datosEncargo.telefono ||
      !datosEncargo.formaPago
    ) {
      alert("Completa los datos del cliente para el encargo");
      return;
    }
    if (carrito.length === 0) {
      alert("Agrega al menos un producto al carrito");
      return;
    }

    // Recolectar info del encargo
    const encargoCompleto = {
      cliente: {
        nombre: datosEncargo.nombre,
        apellido: datosEncargo.apellido,
        telefono: datosEncargo.telefono,
        documento: datosEncargo.documento,
        formaPago: datosEncargo.formaPago,
      },
      productos: carrito.map((item) => {
        const base = {
          colegio: item.colegio,
          prenda: item.prenda,
          talla: item.talla,
          precio: Number(item.precio),
          cantidad: Number(item.cantidad),
          total: Number(item.precio) * Number(item.cantidad),
          entregado: item.entregado === undefined ? false : item.entregado,
        };

        if (carrito.length === 1) {
          return {
            ...base,
            abono: Number(item.abono) || 0,
            saldo: Number(item.saldo) || 0,
          };
        } else {
          return base;
        }
      }),

      abono: Number(datosEncargo.abono) || 0,
      total: carrito.reduce((s, i) => s + (i.total || 0), 0),
      saldo:
        carrito.reduce((s, i) => s + (i.total || 0), 0) -
        (Number(datosEncargo.abono) || 0),
      // NUEVO: incluir clienteId si hay cliente seleccionado del ComboBox
      clienteId: selectedCliente?.id || null,
      clienteResumen: selectedCliente
        ? {
            nombre: selectedCliente.nombre,
            telefono: selectedCliente.telefono,
            documento: selectedCliente.documento,
          }
        : null,
    };

    const exito = await onAgregarEncargo(encargoCompleto);
    if (exito) {
      setCarrito([]);
      setMostrarFormularioEncargo(false);
      setDatosEncargo({
        nombre: "",
        apellido: "",
        telefono: "",
        documento: "",
        formaPago: "",
        abono: 0,
        saldo: 0,
      });
      setSelectedCliente(null); // Limpiar cliente después de registrar
    }
  };

  const stockActual =
    productosDisponibles.find(
      (p) =>
        p.colegio === venta.colegio &&
        p.prenda === venta.prenda &&
        p.talla === venta.talla
    )?.cantidad || 0;

  const totalVenta = venta.cantidad * (venta.precio || 0);
  // === totales basados en SALDOS por ítem ===
  const totalSaldosCarrito = carrito.reduce((acc, i) => {
    const itemTotal =
      i.total ?? (Number(i.precio) || 0) * (Number(i.cantidad) || 0);
    const itemAbono = Number(i.abono) || 0;
    // si viene i.saldo explícito, lo usamos; si no, total - abono
    const itemSaldo = i.saldo != null ? Number(i.saldo) : itemTotal - itemAbono;
    return acc + itemSaldo;
  }, 0);

  const saldoCarrito = Math.max(
    totalSaldosCarrito - Number(abonoCarrito || 0),
    0
  );

  return (
    <div className="ventas-form">
      <div className="sales-form-grid">
        {/* Selects para Colegio/Producto/Talla */}
        <div className="form-field">
          <label htmlFor="colegio">Colegio</label>
          <select
            id="colegio"
            name="colegio"
            value={venta.colegio}
            onChange={handleChange}
            required
            style={{ border: !venta.colegio ? "1px solid red" : undefined }}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {catalogos.colegios.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="prenda">Producto</label>
          <select
            id="prenda"
            name="prenda"
            value={venta.prenda}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar</option>
            {catalogos.prendas.map((p, i) => (
              <option key={i} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="talla">Talla</label>
          <select
            id="talla"
            name="talla"
            value={venta.talla}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar</option>
            {catalogos.tallas.map((t, i) => (
              <option key={i} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="precio">Precio Unitario</label>
          <input
            id="precio"
            type="number"
            name="precio"
            value={venta.precio}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="cantidad">Cantidad</label>
          <div className="cantidad-wrapper">
            <input
              id="cantidad"
              type="number"
              name="cantidad"
              min="1"
              max={stockActual}
              value={venta.cantidad}
              onChange={handleChange}
              required
            />
            <span className="stock-helper">Stock: {stockActual}</span>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="total">Total</label>
          <input
            id="total"
            value={`$${totalVenta.toLocaleString("es-CO")}`}
            readOnly
          />
        </div>
        <div className="form-field">
          <label htmlFor="estado">Estado</label>
          <select
            id="estado"
            name="estado"
            value={venta.estado}
            onChange={(e) => {
              setVenta({ ...venta, estado: e.target.value });
            }}
          >
            <option value="venta">Venta</option>
            <option value="encargo">Encargo</option>
            <option value="separado">Separado</option>
          </select>
        </div>
        {(venta.estado === "separado" || venta.estado === "encargo") &&
          carrito.length <= 0 && (
            <>
              <div className="form-field">
                <label htmlFor="abono">Abono</label>
                <input
                  id="abono"
                  type="number"
                  name="abono"
                  value={venta.abono}
                  onChange={handleChange}
                  min="0"
                  max={totalVenta}
                />
              </div>
              <div className="form-field">
                <label htmlFor="saldo">Saldo</label>
                <input
                  id="saldo"
                  type="number"
                  name="saldo"
                  value={venta.saldo}
                  readOnly
                />
              </div>
            </>
          )}
        <div className="form-field">
          <label htmlFor="metodoPago">Método de Pago</label>
          <select
            id="metodoPago"
            name="metodoPago"
            value={venta.metodoPago}
            onChange={handleChange}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>

        {/* NUEVO: Cliente ComboBox */}
        <div className="form-field">
          <label htmlFor="cliente">Cliente (Opcional)</label>
          <ClienteComboBox
            selectedCliente={selectedCliente}
            onClienteChange={setSelectedCliente}
            placeholder="Buscar cliente por nombre, teléfono o cédula..."
          />
        </div>
      </div>
      <button
        type="button"
        onClick={agregarAlCarrito}
        className="btn-primary add-cart-btn"
      >
        <i className="fa-solid fa-cart-plus" /> Agregar al carrito
      </button>
      <button
        type="button"
        onClick={registrarVenta} // ✅ usa la lógica central
        style={{
          padding: "12px 24px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ✅ REGISTRAR {venta.estado.toUpperCase()}
      </button>

      {/* MODAL ENCARGO */}
      {mostrarFormularioEncargo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            <h3>Datos del Cliente del Encargo</h3>
            <div style={{ marginBottom: "12px" }}>
              <label>Nombre *</label>
              <input
                name="nombre"
                value={datosEncargo.nombre}
                onChange={handleChangeEncargo}
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Apellido</label>
              <input
                name="apellido"
                value={datosEncargo.apellido}
                onChange={handleChangeEncargo}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Teléfono *</label>
              <input
                name="telefono"
                value={datosEncargo.telefono}
                onChange={handleChangeEncargo}
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Identificación</label>
              <input
                name="documento"
                value={datosEncargo.documento}
                onChange={handleChangeEncargo}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Forma de pago *</label>
              <select
                name="formaPago"
                value={datosEncargo.formaPago}
                onChange={handleChangeEncargo}
                required
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="">Seleccionar...</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Abono Total del Encargo</label>
              <input
                type="number"
                name="abono"
                value={datosEncargo.abono}
                onChange={handleChangeEncargo}
                min="0"
                max={carrito.reduce((s, i) => s + (i.total || 0), 0)}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Saldo (automático)</label>
              <input
                type="number"
                value={
                  carrito.reduce((s, i) => s + (i.total || 0), 0) -
                  (Number(datosEncargo.abono) || 0)
                }
                readOnly
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#f0f0f0",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button onClick={() => setMostrarFormularioEncargo(false)}>
                Cancelar
              </button>
              <button
                onClick={registrarEncargo}
                disabled={
                  !datosEncargo.nombre ||
                  !datosEncargo.telefono ||
                  !datosEncargo.formaPago
                }
              >
                Registrar Encargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carrito de compras */}
      {carrito.length > 0 && (
        <div
          style={{
            marginTop: "30px",
            border: "1px solid #ddd",
            padding: "15px",
            borderRadius: "5px",
          }}
        >
          <h3>Productos en Carrito</h3>

          {/* Mostrar cliente seleccionado si existe */}
          {selectedCliente && (
            <div
              style={{
                backgroundColor: "#f0f8ff",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "15px",
                border: "1px solid #0052cc",
              }}
            >
              <strong>Cliente seleccionado:</strong> {selectedCliente.nombre}
              {selectedCliente.telefono && ` — ${selectedCliente.telefono}`}
              {selectedCliente.documento && ` — ${selectedCliente.documento}`}
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Prenda
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Colegio
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Talla
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Cantidad
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Precio Unit.
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Total
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Abono
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Saldo
                </th>
                <th style={{ textAlign: "center", width: "130px" }}>
                  Pendiente entrega
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {carrito.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    {item.prenda}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    {item.colegio}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    {item.talla}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    {item.cantidad}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    ${item.precio.toLocaleString("es-CO")}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    ${item.total.toLocaleString("es-CO")}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    ${item.abono?.toLocaleString("es-CO") || "0"}
                  </td>
                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    ${item.saldo?.toLocaleString("es-CO") || "0"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!item.entregado} // true = pendiente
                        onChange={() => togglePendienteEntrega(item.id)}
                        style={{
                          transform: "scale(1.3)",
                          accentColor: "#f44336",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ fontSize: "0.95em", color: "#555" }}>
                        (Pendiente)
                      </span>
                    </label>
                  </td>

                  <td
                    style={{ padding: "8px", borderBottom: "1px solid #ddd" }}
                  >
                    <button
                      onClick={() => eliminarDelCarrito(item.id)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "3px",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontWeight: "bold",
                  }}
                >
                  {carrito.some((item) => item.abono && item.abono > 0)
                    ? "Saldo:"
                    : "Total:"}
                </td>
                <td style={{ padding: "8px", fontWeight: "bold" }}>
                  $
                  {carrito.some((item) => item.abono && item.abono > 0)
                    ? (
                        carrito.reduce((sum, i) => sum + (i.total || 0), 0) -
                        carrito.reduce((sum, i) => sum + (i.abono || 0), 0)
                      ).toLocaleString("es-CO")
                    : carrito
                        .reduce((sum, i) => sum + (i.total || 0), 0)
                        .toLocaleString("es-CO")}
                </td>
                <td></td>
              </tr>
              <tr></tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 🔵 PASO 5: Panel inline de Abono/Saldo global para ENCARGO/SEPARADO */}
      {(venta.estado === "encargo" || venta.estado === "separado") &&
        carrito.length > 0 && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#f9fafb",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <div className="form-field">
              <label>Total del carrito</label>
              <input
                readOnly
                value={`$${totalSaldosCarrito.toLocaleString("es-CO")}`}
                style={{ fontWeight: "bold", background: "#eef2ff" }}
              />
            </div>

            <div className="form-field">
              <label>Abono del encargo</label>
              <input
                type="number"
                min={0}
                max={totalSaldosCarrito}
                value={abonoCarrito}
                onChange={(e) => setAbonoCarrito(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Saldo</label>
              <input
                readOnly
                value={`$${saldoCarrito.toLocaleString("es-CO")}`}
                style={{ fontWeight: "bold", background: "#eef2ff" }}
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default VentasForm;
