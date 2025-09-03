import { useMemo } from "react";

const removeDiacritics = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");

const norm = (s) => removeDiacritics(String(s || "").trim().toLowerCase());

const normalizeTalla = (v) => {
  const t = String(v ?? "").trim().toUpperCase();
  const mapTxt = { S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL" };
  if (mapTxt[t]) return mapTxt[t];
  const num = t.replace(/[^\d]/g, "");
  return num ? Number(num) : null;
};

const TALLAS = [6, 8, 10, 12, 14, 16, "S", "M", "L", "XL", "XXL"];

export const useStockPivot = (productos) => {
  const { byPlantel, labelPlantel } = useMemo(() => {
    const byPlantel = new Map();
    const labelPlantel = new Map();

    for (const item of productos) {
      const plantelKey = norm(item.colegio);
      const productoKey = norm(item.prenda);
      const tallaKey = normalizeTalla(item.talla);
      const qty = Number(item.cantidad) || 0;

      if (!plantelKey || !productoKey || !tallaKey) continue;
      if (!TALLAS.includes(tallaKey)) continue;

      if (!byPlantel.has(plantelKey)) byPlantel.set(plantelKey, new Map());
      if (!labelPlantel.has(plantelKey))
        labelPlantel.set(plantelKey, String(item.colegio).trim());

      const byProducto = byPlantel.get(plantelKey);
      if (!byProducto.has(productoKey)) {
        byProducto.set(productoKey, {
          label: String(item.prenda).trim(),
          plantel: String(item.colegio).trim(),
          tallas: Object.fromEntries(TALLAS.map((t) => [t, 0])),
        });
      }
      byProducto.get(productoKey).tallas[tallaKey] += qty;
    }

    return { byPlantel, labelPlantel };
  }, [productos]);

  const planteles = useMemo(
    () =>
      Array.from(labelPlantel.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([key, label]) => ({ key, label })),
    [labelPlantel]
  );

  const getRowsForPlantel = useMemo(() => {
    return (plantelKey, searchTerm = "", stockFilter = "todos") => {
      const byProducto = byPlantel.get(plantelKey);
      if (!byProducto) return [];

      let rows = Array.from(byProducto.values()).map((row) => {
        const total = TALLAS.reduce((sum, t) => sum + (row.tallas[t] || 0), 0);
        return { 
          ...row, 
          total,
          tallasConStock: TALLAS.filter(t => (row.tallas[t] || 0) > 0).length,
          tallasEnCero: TALLAS.filter(t => (row.tallas[t] || 0) === 0).length,
          tallasNegativas: TALLAS.filter(t => (row.tallas[t] || 0) < 0).length
        };
      });

      // Filtro por búsqueda
      if (searchTerm.trim()) {
        const searchNorm = norm(searchTerm);
        rows = rows.filter(r => 
          norm(r.label).includes(searchNorm) || 
          norm(r.plantel).includes(searchNorm)
        );
      }

      // Filtro por estado de stock
      switch (stockFilter) {
        case "con-stock":
          rows = rows.filter(r => r.total > 0);
          break;
        case "bajo-stock":
          rows = rows.filter(r => r.total > 0 && r.total <= 4);
          break;
        case "sin-stock":
          rows = rows.filter(r => r.total === 0);
          break;
        case "negativo":
          rows = rows.filter(r => r.total < 0 || r.tallasNegativas > 0);
          break;
        default:
          // "todos" - no filtrar
          break;
      }

      return rows.sort((a, b) => a.label.localeCompare(b.label));
    };
  }, [byPlantel]);

  const getBadgeClass = (n) => {
    if (n < 0) return "badge badge--neg";
    if (n === 0) return "badge badge--zero";
    if (n <= 4) return "badge badge--low";
    if (n <= 8) return "badge badge--mid";
    return "badge badge--high";
  };

  const getStockStatus = (total) => {
    if (total < 0) return { status: "negativo", icon: "⚠️", color: "danger" };
    if (total === 0) return { status: "sin-stock", icon: "🚫", color: "muted" };
    if (total <= 4) return { status: "bajo", icon: "⚠️", color: "warning" };
    if (total <= 8) return { status: "medio", icon: "📦", color: "primary" };
    return { status: "alto", icon: "✅", color: "success" };
  };

  return {
    planteles,
    getRowsForPlantel,
    getBadgeClass,
    getStockStatus,
    TALLAS
  };
};