import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const VentasForm = ({ productoEscaneado, onAgregar }) => {
  const [venta, setVenta] = useState({
    colegio: "",
    prenda: "",
    talla: "",
    precio: "",
    cantidad: 1,
    metodoPago: "efectivo",
    estado: "venta",
    cliente: ""
  });

  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [catalogos, setCatalogos] = useState({ colegios: [], prendas: [], tallas: [] });

  // Cargar datos iniciales
useEffect(() => {
  const cargarDatos = async () => {
    const [stockSnap, catalogSnap] = await Promise.all([
      getDocs(collection(db, "stock_actual")),
      getDocs(collection(db, "productos_catalogo"))
    ]);

    setProductosDisponibles(stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    const catalogData = catalogSnap.docs.map(doc => doc.data());
    
    // Orden personalizado para tallas
    const ordenTallas = ['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'];
    const tallasUnicas = [...new Set(catalogData.map(p => p.talla))];
    const tallasOrdenadas = tallasUnicas.sort((a, b) => {
      const indexA = ordenTallas.indexOf(a);
      const indexB = ordenTallas.indexOf(b);
      return indexA - indexB;
    }).filter(t => t); // Filtra valores undefined/null

    setCatalogos({
      colegios: [...new Set(catalogData.map(p => p.colegio))].sort(),
      prendas: [...new Set(catalogData.map(p => p.prenda))].sort(),
      tallas: tallasOrdenadas
    });
  };

  cargarDatos();
}, []);

  // Autocompletar con QR
  useEffect(() => {
    if (productoEscaneado) {
      setVenta(prev => ({
        ...prev,
        colegio: productoEscaneado.colegio,
        prenda: productoEscaneado.prenda,
        talla: productoEscaneado.talla,
        precio: productoEscaneado.precio
      }));
    }
  }, [productoEscaneado]);

  const handleChange = (e) => {
    setVenta({ ...venta, [e.target.name]: e.target.value });
  };

  // Obtener stock actual
  const stockActual = productosDisponibles.find(p => 
    p.colegio === venta.colegio && 
    p.prenda === venta.prenda && 
    p.talla === venta.talla
  )?.cantidad || 0;

  // Calcular total
  const totalVenta = venta.cantidad * (venta.precio || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stockActual < venta.cantidad) {
      alert(`¡Stock insuficiente! Solo hay ${stockActual} unidades disponibles`);
      return;
    }
    onAgregar({
      ...venta,
      cantidad: parseInt(venta.cantidad),
      precio: parseInt(venta.precio)
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: "20px 0" }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "10px",
        marginBottom: "15px"
      }}>
        {/* Selects para Colegio/Producto/Talla */}
        <div>
          <label>Colegio</label>
          <select name="colegio" value={venta.colegio} onChange={handleChange} required>
            <option value="">Seleccionar</option>
            {catalogos.colegios.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Producto</label>
          <select name="prenda" value={venta.prenda} onChange={handleChange} required>
            <option value="">Seleccionar</option>
            {catalogos.prendas.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Talla</label>
          <select name="talla" value={venta.talla} onChange={handleChange} required>
            <option value="">Seleccionar</option>
            {catalogos.tallas.map((t, i) => (
              <option key={i} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Campos numéricos */}
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

        {/* Total */}
        <div>
          <label>Total</label>
          <input
            value={`$${totalVenta.toLocaleString("es-CO")}`}
            readOnly
            style={{ backgroundColor: "#f0f0f0" }}
          />
        </div>

        {/* Otros campos */}
        <div>
          <label>Método de Pago</label>
          <select name="metodoPago" value={venta.metodoPago} onChange={handleChange}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>

        <div>
          <label>Estado</label>
          <select name="estado" value={venta.estado} onChange={handleChange}>
            <option value="venta">Venta</option>
            <option value="encargo">Encargo</option>
            <option value="separado">Separado</option>
          </select>
        </div>

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
        type="submit" 
        style={{
          padding: "12px 24px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer",
          width: "100%",
          fontWeight: "bold",
          marginTop: "10px"
        }}
      >
        ✅ REGISTRAR VENTA
      </button>
    </form>
  );
};

export default VentasForm;