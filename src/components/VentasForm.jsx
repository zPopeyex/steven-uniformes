import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const VentasForm = ({ productoEscaneado, onAgregar, onAgregarEncargo }) => {
  const [venta, setVenta] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
    cantidad: 1,
    metodoPago: "efectivo",
    estado: "venta",
    cliente: "",
    abono: 0,
    saldo: 0,
  });

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
    saldo: 0, // <-- agrega el valor
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

  // ** Handler para el modal de encargo **
  // Cambios en los datos del cliente del encargo
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
    // Producto nuevo
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
      cliente: venta.cliente?.trim() || "",
      total: totalItem,
      abono,
      saldo,
      id: Date.now(),
      entregado: true,
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
    if (venta.estado === "encargo") {
      if (carrito.length === 0) {
        alert(
          "Agrega al menos un producto al carrito antes de registrar el encargo"
        );
        return;
      }
      setDatosEncargo((prev) => ({
        ...prev,
        abono: Number(venta.abono) || 0,
      }));
      setMostrarFormularioEncargo(true);
      return;
    }
    // ... resto del código para ventas normales
    const exito = await onAgregar(carrito);
    if (exito) setCarrito([]);
  };

  // Registrar el encargo correctamente
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
          entregado: item.entregado === undefined ? false : item.entregado, // así como lo tengas en el carrito
        };

        if (carrito.length === 1) {
          return {
            ...base,
            abono: Number(item.abono) || 0,
            saldo: Number(item.saldo) || 0,
          };
        } else {
          return base; // sin abono/saldo individual
        }
      }),

      abono: Number(datosEncargo.abono) || 0,
      total: carrito.reduce((s, i) => s + (i.total || 0), 0),
      saldo:
        carrito.reduce((s, i) => s + (i.total || 0), 0) -
        (Number(datosEncargo.abono) || 0),
    };
    // Llamar al handler padre
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

  return (
    <div style={{ margin: "20px 0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        {/* Selects para Colegio/Producto/Talla */}
        <div>
          <label>Colegio</label>
          <select
            name="colegio"
            value={venta.colegio}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              border: !venta.colegio ? "1px solid red" : "1px solid #ddd",
            }}
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
        <div>
          <label>Producto</label>
          <select
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
        <div>
          <label>Talla</label>
          <select
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
        <div>
          <label>Precio Unitario</label>
          <input
            type="number"
            name="precio"
            value={venta.precio}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Cantidad (Stock: {stockActual})</label>
          <input
            type="number"
            name="cantidad"
            min="1"
            max={stockActual}
            value={venta.cantidad}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Total</label>
          <input
            value={`$${totalVenta.toLocaleString("es-CO")}`}
            readOnly
            style={{ backgroundColor: "#f0f0f0" }}
          />
        </div>
        <div>
          <label>Método de Pago</label>
          <select
            name="metodoPago"
            value={venta.metodoPago}
            onChange={handleChange}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>
        <div>
          <label>Estado</label>
          <select
            name="estado"
            value={venta.estado}
            onChange={(e) => {
              setVenta({ ...venta, estado: e.target.value });
            }}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border:
                venta.estado === "encargo"
                  ? "2px solid #2196F3"
                  : "1px solid #ddd",
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
              <div>
                <label>Abono</label>
                <input
                  type="number"
                  name="abono"
                  value={venta.abono}
                  onChange={handleChange}
                  min="0"
                  max={totalVenta}
                />
              </div>
              <div>
                <label>Saldo</label>
                <input
                  type="number"
                  name="saldo"
                  value={venta.saldo}
                  readOnly
                  style={{ backgroundColor: "#f0f0f0" }}
                />
              </div>
            </>
          )}

        <div>
          <label>Cliente (Opcional)</label>
          <input
            name="cliente"
            value={venta.cliente}
            onChange={handleChange}
            placeholder="Nombre del cliente"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={agregarAlCarrito}
        style={{
          padding: "12px 24px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer",
          marginRight: "10px",
          fontWeight: "bold",
        }}
      >
        ➕ AGREGAR AL CARRITO
      </button>
      <button
        type="button"
        onClick={() => {
          if (venta.estado === "encargo") {
            if (carrito.length === 0) {
              alert(
                "Agrega al menos un producto al carrito antes de registrar el encargo"
              );
              return;
            }
            setMostrarFormularioEncargo(true); // Solo abre el modal
          } else {
            registrarVenta(); // Venta y separado van normal
          }
        }}
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
            {/* Opcional: Abono y saldo a nivel de encargo */}
            {/* <div style={{ marginBottom: "12px" }}>
              <label>Abono</label>
              <input
                type="number"
                name="abono"
                value={datosEncargo.abono}
                onChange={handleChangeEncargo}
                style={{ width: "100%", padding: "8px" }}
                min={0}
                max={carrito.reduce((s, i) => s + i.total, 0)}
              />
            </div> */}
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
                          accentColor: "#f44336", // hace que el check sea rojo (opcional)
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
    </div>
  );
};

export default VentasForm;
