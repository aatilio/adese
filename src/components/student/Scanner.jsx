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
}) {
  const scannerRef = useRef(null);

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
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => onScan(decodedText),
        () => {},
      )
      .catch(() => {
        toast.error("No se pudo acceder a la cámara");
        setStep(STEPS.SELECT);
      });
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
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
        disabled={loading || !estado}
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
      />
      <button
        className={`btn btn-sm w-full ${inputCode.length === 16 ? 'btn-success' : 'btn-ghost'}`}
        onClick={() => onScan(inputCode)}
        disabled={loading || !estado || inputCode.length !== 16}
        style={{
          border: inputCode.length === 16 ? "none" : "1px solid var(--gray-200)",
        }}
      >
        {loading ? <div className="spinner" /> : "Confirmar Código"}
      </button>
    </div>
  );
}
