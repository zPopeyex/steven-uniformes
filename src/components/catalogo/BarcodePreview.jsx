import React, { useEffect, useRef, useState } from "react";

// Lazy mounts its children only when visible (IntersectionObserver)
export default function BarcodePreview({ children, height = 36 }) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hostRef.current || visible) return;
    const el = hostRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={hostRef} style={{ minHeight: height, display: "flex", alignItems: "center" }}>
      {visible ? children : <div className="barcode-skeleton" style={{ width: 120, height }} />}
    </div>
  );
}

