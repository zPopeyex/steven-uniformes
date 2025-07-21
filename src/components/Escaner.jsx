
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const Escaner = ({ onScan }) => {
  const qrCodeRegionId = "reader";
  const html5QrCodeRef = useRef(null);
  const isRunningRef = useRef(false);
  const isStartingRef = useRef(false);
  const [activo, setActivo] = useState(true);

  const iniciarScanner = async () => {
    if (isStartingRef.current || isRunningRef.current) return;

    isStartingRef.current = true;
    try {
      const readerElement = document.getElementById(qrCodeRegionId);
      if (!readerElement) return;

      html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
      const devices = await Html5Qrcode.getCameras();
      

      if (devices.length === 0) return;

      const backCamera =
        devices.find((d) => /back|rear/i.test(d.label)) || devices[0];
    
      await html5QrCodeRef.current.start(
        backCamera.id,
        { fps: 30, qrbox: 400 },
        (decodedText) => {
          onScan(decodedText); // ✅ ejecutar función de escaneo
          console.log("QR detectado:", decodedText); // ✅ confirmación
          
        }
      );

      isRunningRef.current = true;
    } catch (error) {
      console.error("Error iniciando escáner:", error);
    } finally {
      isStartingRef.current = false;
    }
  };

  const detenerScanner = async () => {
    if (html5QrCodeRef.current && isRunningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        isRunningRef.current = false;
        setActivo(false);
      } catch (err) {
        console.error("Error al detener escáner:", err);
      }
    }
  };

  useEffect(() => {
    //setTimeout(() => {
    //onScan("Inem-Camibuso-14-18000"); // Simula escaneo manual
  //}, 3000);
    if (activo) iniciarScanner();
    

    return () => {
      detenerScanner();
    };
  }, [activo]);

  return (
    <div style={{ marginBottom: "20px" }}>
      {activo && <div id={qrCodeRegionId} style={{ width: "100%" }}></div>}
      <button
        onClick={detenerScanner}
        style={{
          marginTop: "10px",
          backgroundColor: "#e74c3c",
          color: "white",
          padding: "5px 10px",
          borderRadius: "5px",
        }}
      >
        Detener escáner
      </button>
    </div>
  );
};

export default Escaner;
