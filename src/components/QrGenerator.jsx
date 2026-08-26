import { useCallback, useState, useEffect } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from './Toast';

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function QrGenerator({ sesion, onRefresh }) {
  const token = sesion?.token_qr || '';
  const [timeLeft, setTimeLeft] = useState(60);

  // Reiniciar el contador local cada vez que cambia el token (que cambia cada 60s en el padre)
  useEffect(() => {
    setTimeLeft(60);
  }, [token]);

  // Ticker de 1 segundo para la barra visual
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const copyCode = useCallback(async () => {
    if (!token) return;
    const ok = await copyToClipboard(token);
    if (ok) toast.success('Código copiado al portapapeles');
    else toast.error('No se pudo copiar. Selecciona el texto manualmente.');
  }, [token]);

  return (
    <div className="qr-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 2rem' }}>
      {token ? (
        <div style={{ position: 'relative' }}>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Renovar código QR manualmente"
              style={{
                position: 'absolute',
                top: '-24px',
                right: '-24px',
                background: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                zIndex: 10,
                transition: 'transform 0.2s ease, background 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(30deg) scale(1.1)'; e.currentTarget.style.background = '#059669'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(0deg) scale(1)'; e.currentTarget.style.background = 'var(--success)'; }}
            >
              <RefreshCw size={16} />
            </button>
          )}
          <QRCodeSVG
            value={token}
            size={240}
            bgColor="#ffffff"
            fgColor="#111827"
            level="H"
            style={{ borderRadius: '8px', border: '10px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          />
          {/* Barra de progreso discreta */}
          <div style={{ 
            position: 'absolute', 
            bottom: '-5px', 
            left: '10px', 
            right: '10px', 
            height: '3px', 
            background: 'var(--gray-100)', 
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              background: 'var(--primary)', 
              width: `${(timeLeft / 60) * 100}%`,
              transition: 'width 1s linear',
              opacity: 0.6
            }} />
          </div>
        </div>
      ) : (
        <div style={{ width: 240, height: 240, background: 'var(--gray-100)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--gray-400)' }} />
        </div>
      )}

      <div style={{ marginTop: '0.5rem', textAlign: 'center', width: '100%', maxWidth: '320px' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código Manual</p>
        <button
          type="button"
          className="qr-manual-copy"
          onClick={copyCode}
          disabled={!token}
          title="Click para copiar código completo"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'var(--primary-bg)',
            color: 'var(--primary-dark)',
            border: '1px dashed var(--primary-light)',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            cursor: token ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          <Copy size={16} strokeWidth={2.5} style={{ opacity: 0.7 }} />
          <span
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              fontFamily: 'monospace',
              color: 'var(--primary-dark)',
              userSelect: 'all',
            }}
          >
            {token || '----------------'}
          </span>
        </button>
        <p style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>
          Código de 16 caracteres para validación manual en caso de problemas con la cámara
        </p>
      </div>
    </div>
  );
}
