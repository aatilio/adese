import { useEffect, useCallback, useRef } from 'react';
import { Users } from 'lucide-react';
import { api } from '../api/client';

const BADGE = {
  Puntual:     'badge-puntual',
  Presente:    'badge-presente',
  Tarde:       'badge-tarde',
  Justificado: 'badge-justificado',
};

const fmt = (iso) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

export default function AttendanceTable({ sesionId, asistencias = [], setAsistencias, estadosUI = {} }) {
  // Ref para rastrear la cantidad anterior de alumnos y evitar bucles
  const prevCountRef = useRef(asistencias?.length || 0);

  // Función para generar un sonido de éxito (Ping)
  const playSuccessSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.error("No se pudo reproducir el sonido:", e);
    }
  }, []);

  // Efecto para disparar el sonido cuando aumenta la cuenta
  useEffect(() => {
    const currentLen = asistencias?.length || 0;
    if (currentLen > prevCountRef.current && prevCountRef.current > 0) {
      playSuccessSound();
    }
    prevCountRef.current = currentLen;
  }, [asistencias?.length, playSuccessSound]);

  const fetchAsistencias = useCallback(async () => {
    if (!sesionId) return;
    try {
      const res = await api.getAsistencias(sesionId);
      // Blindaje: Si no hay datos, enviamos array vacío
      setAsistencias(res?.asistencias || []);
    } catch (err) {
      console.error("Error cargando asistencias:", err);
      // No actualizamos el estado o ponemos vacío para evitar el crash
      setAsistencias([]);
    }
  }, [sesionId, setAsistencias]);

  useEffect(() => {
    fetchAsistencias();
    const id = setInterval(fetchAsistencias, 5000);
    return () => clearInterval(id);
  }, [fetchAsistencias]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to right, #eff6ff, #ffffff)',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '1px solid #bfdbfe'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#1e3a8a' }}>
          <span className="live-dot" style={{ width: '10px', height: '10px' }} />
          En vivo
        </div>
        <span className="badge-status presente" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '20px', background: '#3b82f6', color: 'white', border: 'none' }}>
          {asistencias.length} registros
        </span>
      </div>

      {asistencias.length === 0 ? (
        <div className="empty-state">
          <Users size={32} strokeWidth={1.5} />
          <p>Esperando alumnos...</p>
        </div>
      ) : (
        <div className="attendance-list">
          {asistencias.map((a) => {
            const ui = estadosUI[a.estado] || {};
            const badgeStyle = {
              background: ui.bg || 'var(--gray-100)',
              color: ui.color || 'var(--gray-700)',
              border: ui.border ? `1px solid ${ui.border}` : '1px solid var(--gray-300)'
            };

            return (
              <div key={a.id} className="attendance-item">
                <div className="attendance-item-info">
                  <span className="attendance-item-name">{a.nombre_completo}</span>
                  <span className="attendance-item-time">{fmt(a.fecha_hora)}</span>
                </div>
                <span className={`badge-status`} style={badgeStyle}>{a.estado}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
