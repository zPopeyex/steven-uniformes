// src/components/Escaner.jsx
import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

/**
 * Escaner con dos modos:
 * - HID (por defecto): captura el teclado de la pistola en un <input> invisible pero accesible.
 * - Cámara (opcional, useCamera=true): usa @ericblade/quagga2 para leer Code128/EAN*.
 *
 * Firma pública conservada: export default function Escaner(props) { ... }
 * Callback conservado: usa la MISMA prop de callback que ya existía (p.ej. onScan).
 * No cambia payload: entrega el string escaneado tal como llega (el form puede seguir resolviendo).
 */
export default function Escaner(props) {
  const {
    className,
    placeholder = "Enfoca el cursor aquí y escanea…",
    useCamera = false, // <- opcional, por defecto HID
    disabled = false,
    // NO CAMBIAR: intentamos respetar el nombre original del callback.
    // Si en tu proyecto se llama de otra forma (onScan, onDetected, etc.),
    // este alias lo encontrará sin que cambies tus importadores.
    // 🔹 Sacamos onScan y otros callbacks para que no vayan al <div>
    onScan,
    onDetected,
    onResult,
    onRead,
    onCode,
    onValue,
    onChange,
    ...rest // aquí quedan solo props seguros como id, title, data-*, etc.
  } = props;
  // 🔹 Escogemos el callback que exista
  const callback =
    onScan ??
    onDetected ??
    onResult ??
    onRead ??
    onCode ??
    onValue ??
    onChange ??
    (() => {}); // Fallback no-op si el proyecto inyecta el handler luego

  // Resolución del escaneo:
  // 1) Intentar por productos_catalogo.barcodeShort (nuevo principal)
  // 2) Si no, intentar por productos_catalogo.barcode (largo legacy)
  // 3) Si no, devolver el texto tal cual (compat con QR antiguo)
  async function resolveScan(raw) {
    const code = (raw || "").trim();
    if (!code) return code;

    try {
      // 1) Resolver por barcodeShort
      const qShort = query(
        collection(db, "productos_catalogo"),
        where("barcodeShort", "==", code),
        limit(1)
      );
      const sShort = await getDocs(qShort);
      if (!sShort.empty) {
        const d = sShort.docs[0].data();
        const long = d.barcode || `${d.colegio}-${d.prenda}-${d.talla}-${d.precio}`;
        return long;
      }

      // 2) Resolver por barcode largo existente
      const qLong = query(
        collection(db, "productos_catalogo"),
        where("barcode", "==", code),
        limit(1)
      );
      const sLong = await getDocs(qLong);
      if (!sLong.empty) {
        const d = sLong.docs[0].data();
        return d.barcode || code;
      }

      // 3) Fallback: QR/código previo
      return code;
    } catch {
      return code;
    }
  }

  // --- MODO HID (pistola) ---
  const inputRef = useRef(null);
  const bufRef = useRef("");
  const timerRef = useRef(null);

  const flushBuffer = () => {
    const raw = bufRef.current.trim();
    if (!raw) return;
    (async () => {
      try {
        const resolved = await resolveScan(raw);
        if (DEBUG) {
          setLastRead(resolved);
          setLastSource("HID");
        }

        callback(resolved);
      } finally {
        bufRef.current = "";
      }
    })();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    // Evita cortar la cadena si el form tiene atajos
    e.stopPropagation();

    // Enter dispara lectura inmediata
    if (e.key === "Enter") {
      e.preventDefault();
      flushBuffer();
      return;
    }

    // Ignora teclas de control
    if (e.key.length !== 1) return;

    bufRef.current += e.key;

    // Reset del timer de pausa 150–250ms
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushBuffer, 180);
  };

  useEffect(() => {
    if (disabled) return;
    // Auto-focus al montar y cada vez que el usuario haga click en el wrapper
    const el = inputRef.current;
    el && el.focus();
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // --- MODO CÁMARA (opcional) ---

  // Cámara

  const quaggaRef = useRef(null);
  const [camOn, setCamOn] = useState(Boolean(useCamera)); // 🔹 control iniciar/detener

  const cameraContainerRef = useRef(null);
  const detectingRef = useRef(false);

  const DEBUG = true; // ponlo en true cuando quieras ver el overlay
  const [lastRead, setLastRead] = useState("");
  const [lastSource, setLastSource] = useState("");

  useEffect(() => {
    let stopped = false;

    const startCamera = async () => {
      try {
        const mod = await import("@ericblade/quagga2");
        const quagga = mod.default || mod;
        quaggaRef.current = quagga;

        await new Promise((resolve, reject) => {
          quagga.init(
            {
              inputStream: {
                type: "LiveStream",
                target: cameraContainerRef.current,
                constraints: {
                  facingMode: "environment",
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                area: { top: "0%", right: "0%", left: "0%", bottom: "0%" },
              },
              decoder: { readers: ["code_128_reader"] }, // solo Code128
              locate: true,
              locator: { patchSize: "medium", halfSample: true },
              numOfWorkers: navigator.hardwareConcurrency
                ? Math.min(4, navigator.hardwareConcurrency)
                : 2,
              frequency: 10,
            },
            (err) => (err ? reject(err) : resolve())
          );
        });

        if (stopped) return;
        quaggaRef.current.start();

        quaggaRef.current.onDetected((result) => {
          if (detectingRef.current) return;
          detectingRef.current = true;

          const code = result?.codeResult?.code?.trim();
          if (code) {
            (async () => {
              const resolved = await resolveScan(code);
              if (DEBUG) {
                setLastRead(resolved);
                setLastSource("CAM");
              }

              callback(resolved);
            })();
            setTimeout(() => {
              detectingRef.current = false;
            }, 600);
          } else {
            detectingRef.current = false;
          }
        });
      } catch (e) {
        // si falla, el modo HID sigue funcionando
      }
    };

    const stopCamera = () => {
      try {
        const q = quaggaRef.current;
        q?.offDetected && q.offDetected();
        q?.stop && q.stop();
      } catch {}
    };

    if (camOn && !disabled) startCamera();
    return () => {
      stopped = true;
      stopCamera();
    };
  }, [camOn, disabled, callback]);

  return (
    <div
      className={className}
      onClick={() => {
        // Facilita re-enfocar el input HID si el usuario hace click
        inputRef.current && inputRef.current.focus();
      }}
      style={{ position: "relative" }}
      {...rest}
    >
      {/* INPUT HID: invisible pero accesible */}
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        autoFocus
        aria-label={placeholder}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        disabled={disabled}
        // visualmente oculto pero funcional para la pistola
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Contenedor cámara (solo si useCamera=true) */}
      {useCamera && (
        <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          <button
            type="button"
            onClick={() => setCamOn(true)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              background: camOn ? "#EFF6FF" : "#fff",
              color: "#1f2937",
            }}
          >
            Iniciar cámara
          </button>
          <button
            type="button"
            onClick={() => setCamOn(false)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              background: !camOn ? "#FFF1F2" : "#fff",
              color: "#1f2937",
            }}
          >
            Detener cámara
          </button>
        </div>
      )}
      {/* Viewfinder */}
      {useCamera && camOn && (
        <div
          ref={cameraContainerRef}
          style={{
            width: "100%",
            height: 420, // 🔹 alto visible
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
            position: "relative",
          }}
        />
      )}

      {DEBUG && (lastRead || lastSource) && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            background: "rgba(0,0,0,.75)",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            zIndex: 9999,
            maxWidth: 360,
            wordBreak: "break-all",
          }}
        >
          <div>
            <b>Último</b>: {lastRead || "—"}
          </div>
          <div style={{ opacity: 0.8 }}>Fuente: {lastSource}</div>
        </div>
      )}
    </div>
  );
}
