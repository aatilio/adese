import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Loader2, KeyRound } from 'lucide-react';
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
  const [manualCode, setManualCode] = useState('');

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

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) {
      toast.error('Por favor ingresa el código de 16 caracteres');
      return;
    }
    if (clean.length < 8) {
      toast.error('El código debe tener al menos 8 caracteres');
      return;
    }
    onScan(clean);
  };

  /* ─── Vistas ──────────────────────────────────────────────────────────── */

  // Mientras loading (procesando la petición al backend) mostramos un spinner
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

  // Vista inicial: Escanear QR o Ingreso de Código Manual
  return (
    <div className="sp-scan-actions">
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => setStep(STEPS.SCANNING)}
        disabled={loading || !estado || disabled}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
      >
        <QrCode size={18} /> Escanear con Cámara QR
      </button>

      <div className="sp-or-divider" style={{ margin: '0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-400)', fontSize: '0.725rem', fontWeight: 700 }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--gray-200, #e2e8f0)' }} />
        <span>O INGRESA EL CÓDIGO MANUAL</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--gray-200, #e2e8f0)' }} />
      </div>

      <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          type="text"
          className="form-input sp-code-input"
          placeholder="Código de 16 dígitos"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          maxLength={16}
          disabled={loading || !estado || disabled}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: '1.05rem',
            fontWeight: '800',
            textAlign: 'center',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            borderRadius: '10px',
            border: '1px solid var(--gray-300, #cbd5e1)',
          }}
        />
        <button
          type="submit"
          className="btn btn-black w-full"
          disabled={loading || !manualCode.trim() || !estado || disabled}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
        >
          <KeyRound size={16} /> Validar Asistencia
        </button>
      </form>
    </div>
  );
}
