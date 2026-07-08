import React, { useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({
  onScan,
  onCancel,
  loading,
  estado,
  inputCode,
  setInputCode,
  STEPS,
  step,
  setStep,
  toast,
  disabled = false,
  scannerRef = null,
}) {
  const localScannerRef = useRef(null);
  const actualScannerRef = scannerRef || localScannerRef;

  useEffect(() => {
    if (step === STEPS.SCANNING) {
      setTimeout(() => initScanner(), 300);
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [step]);

  const initScanner = () => {
    const scanner = new Html5Qrcode("qr-reader");
    actualScannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Detener el scanner inmediatamente después de detectar un código
          scanner.stop().catch(() => {});
          onScan(decodedText);
        },
        () => {},
      )
      .catch(() => {
        toast.error("No se pudo acceder a la cámara");
        setStep(STEPS.SELECT);
      });
  };

  const stopScanner = () => {
    if (actualScannerRef.current) {
      actualScannerRef.current.stop().catch(() => {});
      actualScannerRef.current = null;
    }
  };

  if (step === STEPS.SCANNING) {
    return (
      <div>
        <div id="qr-reader" className="sp-qr-reader" />
        <button
          className="btn btn-ghost mt-2 btn-sm w-full"
          onClick={() => {
            stopScanner();
            onCancel();
          }}
        >
          Cancelar Escaneo
        </button>
      </div>
    );
  }

  return (
    <div className="sp-scan-actions">
      <button
        className="btn btn-black w-full"
        onClick={() => setStep(STEPS.SCANNING)}
        disabled={loading || !estado || disabled}
      >
        <QrCode size={16} style={{ marginRight: "6px" }} /> Escanear QR
      </button>

      <div className="sp-or-divider">O USA EL CÓDIGO</div>

      <input
        placeholder="16 DIGITOS"
        className="form-input sp-code-input"
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
        maxLength={16}
        disabled={disabled}
      />
      <button
        className={`btn btn-sm w-full ${inputCode.length === 16 ? 'btn-success' : 'btn-ghost'}`}
        onClick={() => onScan(inputCode)}
        disabled={loading || !estado || inputCode.length !== 16 || disabled}
        style={{
          border: inputCode.length === 16 ? "none" : "1px solid var(--gray-200)",
        }}
      >
        {loading ? <div className="spinner" /> : "Confirmar Código"}
      </button>
    </div>
  );
}
