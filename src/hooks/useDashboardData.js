import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    ventas: [],
    encargos: [],
    clientes: [],
    productos: [],
    stockActual: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ventasSnap, encargosSnap, clientesSnap, productosSnap, stockSnap] = await Promise.all([
          getDocs(query(collection(db, "ventas"), orderBy("fechaHora", "desc"))),
          getDocs(query(collection(db, "encargos"), orderBy("createdAt", "desc"))),
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "productos_catalogo")),
          getDocs(collection(db, "stock_actual"))
        ]);

        setData({
          ventas: ventasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          encargos: encargosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          clientes: clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          productos: productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          stockActual: stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getVentasDelMes = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return data.ventas.filter(venta => {
      const fechaVenta = venta.fechaHora?.toDate ? venta.fechaHora.toDate() : new Date(venta.fechaHora);
      return fechaVenta >= startOfMonth;
    });
  };

  const getEncargosStats = () => {
    const pendientes = data.encargos.filter(enc => enc.estado === "pendiente").length;
    const entregados = data.encargos.filter(enc => enc.estado === "entregado" || enc.estado === "completado").length;
    return { pendientes, entregados, total: data.encargos.length };
  };

  const getAbonosYSaldos = () => {
    const totalAbonos = data.ventas
      .filter(v => v.estado === "separado")
      .reduce((sum, v) => sum + (v.abono || 0), 0);
    
    const totalSaldos = data.ventas
      .filter(v => v.estado === "separado")
      .reduce((sum, v) => sum + (v.saldo || 0), 0);
    
    return { totalAbonos, totalSaldos };
  };

  const getColegiosMasVendidos = () => {
    const colegioStats = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const colegio = venta.colegio || "Sin especificar";
        if (!colegioStats[colegio]) {
          colegioStats[colegio] = { cantidad: 0, valor: 0 };
        }
        colegioStats[colegio].cantidad += venta.cantidad || 0;
        colegioStats[colegio].valor += (venta.precio || 0) * (venta.cantidad || 0);
      }
    });

    return Object.entries(colegioStats)
      .map(([colegio, stats]) => ({ colegio, ...stats }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  };

  const getProductosMasVendidos = () => {
    const productStats = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const prenda = venta.prenda || "Sin especificar";
        if (!productStats[prenda]) {
          productStats[prenda] = { cantidad: 0, valor: 0 };
        }
        productStats[prenda].cantidad += venta.cantidad || 0;
        productStats[prenda].valor += (venta.precio || 0) * (venta.cantidad || 0);
      }
    });

    return Object.entries(productStats)
      .map(([prenda, stats]) => ({ prenda, ...stats }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  };

  const getTallasMasVendidas = () => {
    const tallaStats = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const talla = venta.talla || "Sin especificar";
        if (!tallaStats[talla]) {
          tallaStats[talla] = { cantidad: 0 };
        }
        tallaStats[talla].cantidad += venta.cantidad || 0;
      }
    });

    return Object.entries(tallaStats)
      .map(([talla, stats]) => ({ talla, ...stats }))
      .sort((a, b) => b.cantidad - a.cantidad);
  };

  const getVentasPorMes = () => {
    const ventasPorMes = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const fecha = venta.fechaHora?.toDate ? venta.fechaHora.toDate() : new Date(venta.fechaHora);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!ventasPorMes[mesKey]) {
          ventasPorMes[mesKey] = { mes: mesKey, valor: 0, cantidad: 0 };
        }
        ventasPorMes[mesKey].valor += (venta.precio || 0) * (venta.cantidad || 0);
        ventasPorMes[mesKey].cantidad += venta.cantidad || 0;
      }
    });

    return Object.values(ventasPorMes).sort((a, b) => a.mes.localeCompare(b.mes));
  };

  const getMetodosPago = () => {
    const metodos = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const metodo = venta.metodoPago || venta.formaPago || "Efectivo";
        if (!metodos[metodo]) {
          metodos[metodo] = { cantidad: 0, valor: 0 };
        }
        metodos[metodo].cantidad += venta.cantidad || 0;
        metodos[metodo].valor += (venta.precio || 0) * (venta.cantidad || 0);
      }
    });

    return Object.entries(metodos)
      .map(([metodo, stats]) => ({ metodo, ...stats }))
      .sort((a, b) => b.valor - a.valor);
  };

  const getTicketPromedio = () => {
    const facturas = {};
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        const numeroFactura = venta.numeroFactura || venta.numeroCorto;
        if (numeroFactura) {
          if (!facturas[numeroFactura]) {
            facturas[numeroFactura] = 0;
          }
          facturas[numeroFactura] += (venta.precio || 0) * (venta.cantidad || 0);
        }
      }
    });

    const valores = Object.values(facturas);
    return valores.length > 0 ? valores.reduce((sum, val) => sum + val, 0) / valores.length : 0;
  };

  const getClientesFrecuentes = () => {
    const clienteStats = {};
    
    data.ventas.forEach(venta => {
      if ((venta.estado === "venta" || venta.estado === "separado") && venta.cliente) {
        if (!clienteStats[venta.cliente]) {
          clienteStats[venta.cliente] = { compras: 0, valor: 0 };
        }
        clienteStats[venta.cliente].compras += 1;
        clienteStats[venta.cliente].valor += (venta.precio || 0) * (venta.cantidad || 0);
      }
    });

    return Object.entries(clienteStats)
      .map(([cliente, stats]) => ({ cliente, ...stats }))
      .sort((a, b) => b.compras - a.compras)
      .slice(0, 5);
  };

  const getDistribucionVentas = () => {
    const tipos = { venta: 0, separado: 0, encargo: 0 };
    
    data.ventas.forEach(venta => {
      if (venta.estado === "venta" || venta.estado === "separado") {
        tipos[venta.estado] += (venta.precio || 0) * (venta.cantidad || 0);
      }
    });

    data.encargos.forEach(encargo => {
      tipos.encargo += encargo.total || 0;
    });

    return tipos;
  };

  return {
    loading,
    data,
    getVentasDelMes,
    getEncargosStats,
    getAbonosYSaldos,
    getColegiosMasVendidos,
    getProductosMasVendidos,
    getTallasMasVendidas,
    getVentasPorMes,
    getMetodosPago,
    getTicketPromedio,
    getClientesFrecuentes,
    getDistribucionVentas
  };
};