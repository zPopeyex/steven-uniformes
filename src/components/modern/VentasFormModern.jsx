import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import ClienteComboBox from "../ClienteComboBox";
import "../../styles/modern-ui.css";
import { useNavigate } from "react-router-dom";

/**
 * VentasFormModern
 * - Misma lógica que VentasForm original
 * - Solo cambia la capa de presentación (clases + CSS en modern-ui.css)
 * - NO elimina nada de tu implementación actual — se agrega como alternativa segura.
 */
const VentasFormModern = ({
  productoEscaneado,
  onAgregar,
  onAgregarEncargo,
}) => {
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

  const [selectedCliente, setSelectedCliente] = useState(null);
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
  const [datosEncargo, setDatosEncargo] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    documento: "",
    formaPago: "",
    abono: 0,
    saldo: 0,
  });
  const navigate = useNavigate();
  const crearCliente = () => {
    // Si en el futuro pasas un prop onNuevoCliente, úsalo:
    if (typeof window?.onNuevoCliente === "function")
      return window.onNuevoCliente();
    // Fallback: ir a la pantalla de clientes
    navigate("/clientes");
  };

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
      const updated = { ...prev, [name]: value };
      if (name === "abono") {
        const total = updatedVenta.cantidad * (updatedVenta.precio || 0);
        const abono = Number(value || 0); // asegura entero
        const saldo = total - abono;
        return { ...updatedVenta, abono, saldo: Math.max(saldo, 0) };
      }

      return updated;
    });
  };

  const handleChangeEncargo = (e) => {
    const { name, value } = e.target;
    setDatosEncargo((prev) => ({ ...prev, [name]: value }));
  };

  const agregarAlCarrito = () => {
    const requeridos = ["colegio", "prenda", "talla", "precio", "cantidad"];
    const faltan = requeridos.filter((c) => !venta[c]);
    if (faltan.length) {
      alert("Faltan campos requeridos: " + faltan.join(", "));
      return;
    }

    const totalItem = Number(venta.precio) * Number(venta.cantidad);
    const esApartado =
      venta.estado === "separado" || venta.estado === "encargo";
    const abono = esApartado ? Number(venta.abono) || 0 : 0;
    const saldo = esApartado ? Math.max(totalItem - abono, 0) : 0;

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
      clienteId: selectedCliente?.id || null,
      clienteResumen: selectedCliente
        ? {
            nombre: selectedCliente.nombre,
            telefono: selectedCliente.telefono,
            documento: selectedCliente.documento,
          }
        : null,
    };

    setCarrito((prev) => [...prev, nuevoItem]);
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

  const eliminarDelCarrito = (id) =>
    setCarrito((prev) => prev.filter((i) => i.id !== id));

  const togglePendienteEntrega = (id) => {
    setCarrito((prev) =>
      prev.map((i) => (i.id === id ? { ...i, entregado: !i.entregado } : i))
    );
  };

  const registrarVenta = async () => {
    if (carrito.length === 0) {
      alert("Agrega al menos un producto al carrito.");
      return;
    }

    if (venta.estado === "encargo") {
      if (selectedCliente) {
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
        const abono = abonoItems + abonoGlobal;
        const saldo = Math.max(total - abono, 0);

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
            entregado: !!i.entregado,
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
          setAbonoCarrito(0);
        }
        return;
      }

      setDatosEncargo((prev) => ({
        ...prev,
        abono: Number(abonoCarrito) || 0,
      }));
      setMostrarFormularioEncargo(true);
      return;
    }

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
      setSelectedCliente(null);
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
  const totalSaldosCarrito = carrito.reduce((acc, i) => {
    const itemTotal =
      i.total ?? (Number(i.precio) || 0) * (Number(i.cantidad) || 0);
    const itemAbono = Number(i.abono) || 0;
    const itemSaldo = i.saldo != null ? Number(i.saldo) : itemTotal - itemAbono;
    return acc + itemSaldo;
  }, 0);

  const saldoCarrito = Math.max(
    totalSaldosCarrito - Number(abonoCarrito || 0),
    0
  );

  return (
    <div className="modern-ventas-form">
      <div className="form-card">
        <div className="form-header form-header--primary">
          <h3>
            <span className="icon">＋</span>Agregar Producto
          </h3>
        </div>

        <div className="form-content">
          <div className="form-row">
            <div className="form-group lg">
              <label htmlFor="colegio">Colegio</label>
              <select
                id="colegio"
                name="colegio"
                value={venta.colegio}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="" disabled>
                  Seleccionar colegio
                </option>
                {catalogos.colegios.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group xl">
              <label htmlFor="prenda">Producto</label>
              <select
                id="prenda"
                name="prenda"
                value={venta.prenda}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Seleccionar producto</option>
                {catalogos.prendas.map((p, i) => (
                  <option key={i} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group md">
              <label htmlFor="talla">Talla</label>
              <select
                id="talla"
                name="talla"
                value={venta.talla}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Seleccionar talla</option>
                {catalogos.tallas.map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group sm">
              <label htmlFor="cantidad">Cantidad</label>
              <div className="cantidad-input">
                <input
                  id="cantidad"
                  type="number"
                  name="cantidad"
                  min="1"
                  max={stockActual}
                  value={venta.cantidad}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
                <span className="stock-info">
                  Stock: <strong>{stockActual}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group sm">
              <label htmlFor="precio">Precio Unitario</label>
              <input
                id="precio"
                type="number"
                name="precio"
                value={venta.precio}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="0"
              />
            </div>

            <div className="form-group sm">
              <label htmlFor="total">Total</label>
              <input
                id="total"
                value={`$${totalVenta.toLocaleString("es-CO")}`}
                readOnly
                className="form-input readonly"
              />
            </div>

            <div className="form-group md">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                name="estado"
                value={venta.estado}
                onChange={(e) => setVenta({ ...venta, estado: e.target.value })}
                className="form-select"
              >
                <option value="venta">Venta</option>
                <option value="encargo">Encargo</option>
                <option value="separado">Separado</option>
              </select>
            </div>

            <div className="form-group md">
              <label htmlFor="metodoPago">Método de Pago</label>
              <select
                id="metodoPago"
                name="metodoPago"
                value={venta.metodoPago}
                onChange={handleChange}
                className="form-select"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
            <div className="form-group xl client-field">
              <label htmlFor="cliente">Cliente (Opcional)</label>
              <div className="cliente-combobox">
                <ClienteComboBox
                  selectedCliente={selectedCliente}
                  onClienteChange={setSelectedCliente}
                  placeholder="Buscar cliente..."
                />
              </div>
            </div>
          </div>

          {(venta.estado === "separado" || venta.estado === "encargo") &&
            carrito.length <= 0 && (
              <div className="form-row abono-row">
                <div className="form-group md">
                  <label htmlFor="abono">Abono</label>
                  <input
                    id="abono"
                    type="number"
                    name="abono"
                    value={venta.abono}
                    onChange={handleChange}
                    min="0"
                    max={totalVenta}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div className="form-group md">
                  <label htmlFor="saldo">Saldo</label>
                  <input
                    id="saldo"
                    type="number"
                    name="saldo"
                    value={venta.saldo}
                    readOnly
                    className="form-input readonly"
                  />
                </div>
              </div>
            )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={agregarAlCarrito}
            className="btn btn-primary"
          >
            Agregar al carrito
          </button>
          <button
            type="button"
            onClick={registrarVenta}
            className="btn btn-success"
          >
            Registrar{" "}
            {venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}
          </button>
        </div>
      </div>

      {mostrarFormularioEncargo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Datos del Cliente del Encargo</h3>
              <button
                className="btn-close"
                onClick={() => setMostrarFormularioEncargo(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    name="nombre"
                    value={datosEncargo.nombre}
                    onChange={handleChangeEncargo}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    name="apellido"
                    value={datosEncargo.apellido}
                    onChange={handleChangeEncargo}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono *</label>
                  <input
                    name="telefono"
                    value={datosEncargo.telefono}
                    onChange={handleChangeEncargo}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Identificación</label>
                  <input
                    name="documento"
                    value={datosEncargo.documento}
                    onChange={handleChangeEncargo}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Forma de pago *</label>
                  <select
                    name="formaPago"
                    value={datosEncargo.formaPago}
                    onChange={handleChangeEncargo}
                    required
                    className="form-select"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Abono Total del Encargo</label>
                  <input
                    type="number"
                    name="abono"
                    value={datosEncargo.abono}
                    onChange={handleChangeEncargo}
                    min="0"
                    max={carrito.reduce((s, i) => s + (i.total || 0), 0)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Saldo (automático)</label>
                  <input
                    type="number"
                    value={
                      carrito.reduce((s, i) => s + (i.total || 0), 0) -
                      (Number(datosEncargo.abono) || 0)
                    }
                    readOnly
                    className="form-input readonly"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setMostrarFormularioEncargo(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-success"
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

      {carrito.length > 0 && (
        <div className="cart-card">
          <div className="cart-header">
            <h3>Productos en Carrito ({carrito.length})</h3>
          </div>

          {selectedCliente && (
            <div className="selected-client">
              <div className="client-info">
                <strong>Cliente seleccionado:</strong> {selectedCliente.nombre}
                {selectedCliente.telefono && ` — ${selectedCliente.telefono}`}
                {selectedCliente.documento && ` — ${selectedCliente.documento}`}
              </div>
            </div>
          )}

          <div className="cart-table-wrapper">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Colegio</th>
                  <th>Talla</th>
                  <th>Cant.</th>
                  <th>P. Unit.</th>
                  <th>Total</th>
                  <th>Abono</th>
                  <th>Saldo</th>
                  <th>Entrega</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item.id}>
                    <td className="product-name">{item.prenda}</td>
                    <td>{item.colegio}</td>
                    <td className="text-center">{item.talla}</td>
                    <td className="text-center">{item.cantidad}</td>
                    <td className="text-right">
                      ${item.precio.toLocaleString("es-CO")}
                    </td>
                    <td className="text-right total-cell">
                      ${item.total.toLocaleString("es-CO")}
                    </td>
                    <td className="text-right">
                      ${item.abono?.toLocaleString("es-CO") || "0"}
                    </td>
                    <td className="text-right">
                      ${item.saldo?.toLocaleString("es-CO") || "0"}
                    </td>
                    <td className="text-center">
                      <label className="delivery-toggle">
                        <input
                          type="checkbox"
                          checked={!item.entregado}
                          onChange={() => togglePendienteEntrega(item.id)}
                        />
                        <span className="toggle-text">
                          {item.entregado ? "✓ Listo" : "⏳ Pendiente"}
                        </span>
                      </label>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="cart-total-row">
                  <td colSpan="5" className="text-right total-label">
                    <strong>
                      {carrito.some((item) => item.abono && item.abono > 0)
                        ? "Saldo Total:"
                        : "Total General:"}
                    </strong>
                  </td>
                  <td className="text-right total-amount">
                    <strong>
                      $
                      {carrito.some((item) => item.abono && item.abono > 0)
                        ? (
                            carrito.reduce(
                              (sum, i) => sum + (i.total || 0),
                              0
                            ) -
                            carrito.reduce((sum, i) => sum + (i.abono || 0), 0)
                          ).toLocaleString("es-CO")
                        : carrito
                            .reduce((sum, i) => sum + (i.total || 0), 0)
                            .toLocaleString("es-CO")}
                    </strong>
                  </td>
                  <td colSpan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {(venta.estado === "encargo" || venta.estado === "separado") &&
        carrito.length > 0 && (
          <div className="abono-panel">
            <div className="panel-header">
              <h4>
                Resumen de{" "}
                {venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}
              </h4>
            </div>
            <div className="panel-content">
              <div className="abono-grid">
                <div className="abono-item">
                  <label>Total del carrito</label>
                  <input
                    readOnly
                    value={`$${totalSaldosCarrito.toLocaleString("es-CO")}`}
                    className="form-input readonly large"
                  />
                </div>
                <div className="abono-item">
                  <label>Abono del {venta.estado}</label>
                  <input
                    type="number"
                    min={0}
                    max={totalSaldosCarrito}
                    value={abonoCarrito}
                    onChange={(e) => setAbonoCarrito(e.target.value)}
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <div className="abono-item">
                  <label>Saldo</label>
                  <input
                    readOnly
                    value={`${saldoCarrito.toLocaleString("es-CO")}`}
                    className="form-input readonly large"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default VentasFormModern;
