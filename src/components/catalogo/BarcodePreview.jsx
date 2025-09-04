import React, { useEffect, useRef } from "react";

// Renderizado Code128 optimizado para impresión de etiquetas
// - Módulo ~0.33–0.43 mm (aprox width: 2px en pantalla)
// - Altura >= 13 mm (aprox 52 px)
// - Quiet zone >= 3 mm (aprox margin: 12 px)
export default function BarcodePreview({ value, height = 52, width = 2, margin = 12, fontSize = 12 }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current || !value) return;
      try {
        const { default: JsBarcode } = await import("jsbarcode");
        if (cancelled) return;
        JsBarcode(ref.current, value, {
          format: "CODE128",
          displayValue: true,
          fontSize,
          margin,
          height,
          width,
          textMargin: 4,
        });
      } catch (e) {
        // noop
      }
    })();
    return () => { cancelled = true; };
  }, [value, height, width, margin, fontSize]);

  return (
    <svg ref={ref} />
  );
}
