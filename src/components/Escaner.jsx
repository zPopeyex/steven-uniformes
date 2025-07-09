import React, { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

const Escaner = ({ onDetect }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => setVisible(!visible)}
        style={{
          backgroundColor: '#333',
          color: 'white',
          padding: '8px 12px',
          border: 'none',
          borderRadius: '5px',
          marginBottom: '10px'
        }}
      >
        {visible ? 'Cerrar Escáner' : '📷 Escanear Código'}
      </button>

      {visible && (
        <div style={{ maxWidth: 400 }}>
          <BarcodeScannerComponent
            width={400}
            height={300}
            onUpdate={(err, result) => {
              if (result) {
                  console.log('🔍 Código detectado:', result.text); // 👈 ver consola
  onDetect(result.text);
  setVisible(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Escaner;
