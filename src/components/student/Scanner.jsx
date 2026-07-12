import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Scanner({
  onScan,
  onCancel,
  loading,
  estado,
  STEPS,
  step,
  setStep,
  toast,
  disabled = false,
}) {
  const scannerInstanceRef = useRef(null);
  const hasScannedRef = useRef(false);   // evita que el callback dispare más de una vez
  const [cameraReady, setCameraReady] = useState(false);

  /* ─── Iniciar / detener cámara según el step ─────────────────────────── */
  useEffect(() => {
    if (step === STEPS.SCANNING) {
      hasScannedRef.current = false;
      const timer = setTimeout(() => initScanner(), 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [step]);

  const initScanner = () => {
    // Si ya hay una instancia viva, no volvemos a crear otra
    if (scannerInstanceRef.current) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerInstanceRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Garantizamos que el callback sólo actúa UNA vez
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // Detenemos la cámara antes de llamar a onScan para evitar
          // que el componente intente desmontarla dos veces
          stopScanner().then(() => {
            onScan(decodedText);
          });
        },
        () => {}, // error de frame — ignorar
      )
      .then(() => setCameraReady(true))
      .catch(() => {
        toast.error('No se pudo acceder a la cámara');
        scannerInstanceRef.current = null;
        setStep(STEPS.SELECT);
      });
  };

  const stopScanner = () => {
    const scanner = scannerInstanceRef.current;
    if (!scanner) return Promise.resolve();

    scannerInstanceRef.current = null;
    setCameraReady(false);

    return scanner
      .stop()
      .catch(() => {})
      .finally(() => {
        // Eliminar el elemento del DOM que crea html5-qrcode para evitar
        // que una reinicialización falle por id duplicado
        try { scanner.clear(); } catch (_) {}
      });
  };

  /* ─── Vistas ──────────────────────────────────────────────────────────── */

  // Mientras loading (procesando la petición al backend) mostramos un spinner
  // en lugar de la pantalla vacía que provocaba el problema original
  if (loading) {
    return (
      <div className="sp-scan-processing">
        <Loader2 size={40} className="sp-scan-spinner" />
        <p className="sp-scan-processing-text">Registrando asistencia…</p>
      </div>
    );
  }

  // Vista del lector de cámara activo
  if (step === STEPS.SCANNING) {
    return (
      <div>
        <div id="qr-reader" className="sp-qr-reader" />
        {!cameraReady && (
          <div className="sp-scan-processing" style={{ marginTop: '0.5rem' }}>
            <Loader2 size={20} className="sp-scan-spinner" />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
              Iniciando cámara…
            </span>
          </div>
        )}
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

  // Vista inicial: sólo el botón de escanear (se elimina el input manual)
  return (
    <div className="sp-scan-actions">
      <button
        className="btn btn-black w-full"
        onClick={() => setStep(STEPS.SCANNING)}
        disabled={loading || !estado || disabled}
      >
        <QrCode size={16} style={{ marginRight: '6px' }} /> Escanear QR
      </button>
    </div>
  );
}
