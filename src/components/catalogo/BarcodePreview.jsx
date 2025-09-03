import React, { useEffect, useRef } from "react";

export default function BarcodePreview({ value, height = 28 }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current || !value) return;
      try {
        const { default: JsBarcode } = await import("jsbarcode");
        if (cancelled) return;
        JsBarcode(ref.current, value, { format: "CODE128", displayValue: true, fontSize: 12, margin: 4, height });
      } catch (e) {
        // noop
      }
    })();
    return () => { cancelled = true; };
  }, [value, height]);

  return (
    <svg ref={ref} />
  );
}

