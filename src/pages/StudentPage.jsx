import { useState, useEffect, useRef, useMemo } from "react";
import {
  LogOut,
  QrCode,
  CheckCircle,
  ClipboardList,
  Clock,
  History,
  Camera,
  Radio,
  Library,
  User,
  BarChart3,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client";
import { toast } from "../components/Toast";
import Header from "../components/Header";
import ProfileView from "../components/ProfileView";
import Footer from "../components/Footer";
import EconometricsPage from "./EconometricsPage";
import '../styles/student.css';

const STEPS = { SELECT: "select", SCANNING: "scanning", DONE: "done" };

export default function StudentPage({ user, onLogout, onUpdateUser }) {
  const [viewMode, setViewMode] = useState("dashboard"); // dashboard | curso | econometrics
  const [cursos, setCursos] = useState([]);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [sesionesCurso, setSesionesCurso] = useState([]);
  const [inputCode, setInputCode] = useState("");

  const [activeTab, setActiveTab] = useState("marcar"); // marcar | historial
  const [step, setStep] = useState(STEPS.SELECT);
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [estadosDB, setEstadosDB] = useState([]);

  // Build dynamic maps from DB
  const ESTADOS = useMemo(
    () => estadosDB.filter((e) => e.nombre !== "Falto").map((e) => e.nombre),
    [estadosDB],
  );
  const ESTADO_COLORS = useMemo(() => {
    const map = {};
    estadosDB.forEach((e) => {
      map[e.nombre] = { bg: e.color, color: "#fff" };
    });
    return map;
  }, [estadosDB]);

  const scannerRef = useRef(null);

  // Time ticker
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cursos & Estados fetch
  useEffect(() => {
    api
      .getEstudianteCursos(user.id)
      .then((res) => setCursos(res.cursos))
      .catch(() => {});
    api
      .getEstados()
      .then((res) => setEstadosDB(res.estados))
      .catch(() => {});
  }, [user.id]);

  // Check for active session
  useEffect(() => {
    const checkSesion = () => {
      api
        .getSesionActiva()
        .then((res) => setSesionActiva(res.sesion))
        .catch(() => setSesionActiva(null));
    };
    checkSesion();
    const interval = setInterval(checkSesion, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch Historial & Sesiones
  useEffect(() => {
    if (!cursoActivo) return;
    if (activeTab === "historial") {
      api
        .getHistorialAlumno(user.id)
        .then((res) => setHistorial(res.historial))
        .catch(() => toast.error("Error cargando historial"));
    }
    if (activeTab === "marcar") {
      api
        .getCursoSesiones(cursoActivo.id)
        .then((res) => {
          const today = new Date().toISOString().slice(0, 10);
          const filtradas = (res.sesiones || []).filter((s) => {
            const sDate = s.fecha_programada
              ? s.fecha_programada.slice(0, 10)
              : s.fecha_inicio.slice(0, 10);
            return sDate === today;
          });
          setSesionesCurso(filtradas);
        })
        .catch(() => {});
    }
  }, [activeTab, user.id, cursoActivo]);

  // Determine valid statuses based on rules
  const getValidStatuses = () => {
    if (sesionActiva?.tipo === 'evento') {
      return ['Participó'];
    }

    // Only use session-level limits
    const limits = sesionActiva?.limite_puntual ? {
      limite_puntual: sesionActiva.limite_puntual,
      limite_presente: sesionActiva.limite_presente,
      limite_tarde: sesionActiva.limite_tarde,
    } : null;

    if (!limits) return [];
    const currentHM = currentTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    let valid = [];
    if (currentHM <= limits.limite_puntual) {
      valid.push('Puntual');
    } else if (currentHM <= limits.limite_presente) {
      valid.push('Presente');
    } else if (currentHM <= limits.limite_tarde) {
      valid.push('Tarde');
    }
    return valid;
  };

  const validStatuses = getValidStatuses();
  useEffect(() => {
    if (validStatuses.length > 0 && !validStatuses.includes(estado)) {
      setEstado(validStatuses[0]);
    } else if (validStatuses.length === 0) {
      setEstado("");
    }
  }, [validStatuses, estado]);

  const startScanner = () => {
    if (!estado) {
      toast.error("Selecciona un estado de asistencia");
      return;
    }
    setStep(STEPS.SCANNING);
    setTimeout(() => initScanner(), 300);
  };

  const initScanner = () => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        handleQrScan,
        () => {},
      )
      .catch(() => {
        toast.error("No se pudo acceder a la cámara");
        setStep(STEPS.SELECT);
      });
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setStep(STEPS.SELECT);
  };

  const handleQrScan = async (decodedText) => {
    await stopScanner();
    setLoading(true);
    try {
      await api.registrarAsistencia({
        token_qr: decodedText,
        estudiante_id: user.id,
        estado,
      });
      const reg = {
        estado,
        hora: new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setRegistered(reg);
      setStep(STEPS.DONE);
      toast.success("¡Asistencia registrada!");
    } catch (err) {
      toast.error(err.message);
      setStep(STEPS.SELECT);
    } finally {
      setLoading(false);
    }
  };

  const fmtHora = (iso) =>
    new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const fmtFecha = (iso) => new Date(iso).toLocaleDateString("es-MX");

  return (
    <div className="app-shell">
      <Header
        user={user}
        roleLabel="Estudiante"
        onLogout={onLogout}
        onOpenProfile={() => setViewMode("perfil")}
        extraOptions={
          viewMode === "curso" ? [
            {
              label: "Marcar Asistencia",
              icon: CheckCircle,
              onClick: () => setActiveTab("marcar"),
              active: activeTab === "marcar"
            },
            {
              label: "Historial",
              icon: History,
              onClick: () => setActiveTab("historial"),
              active: activeTab === "historial"
            },
            ...(cursoActivo?.nombre?.toLowerCase().includes('econometría') ? [
              {
                label: "Estimador",
                icon: BarChart3,
                onClick: () => setActiveTab("econometria"),
                active: activeTab === "econometria"
              }
            ] : [])
          ] : []
        }
      />

      <div className="page-body sp-body">
        {viewMode === "perfil" ? (
          <div>
            <div className="sp-back-wrap">
              <button
                type="button"
                className="btn btn-sm btn-ghost sp-back-btn"
                onClick={() => setViewMode("dashboard")}
              >
                « Volver al Panel
              </button>
            </div>
            <ProfileView 
              user={user} 
              roleLabel="Estudiante"
              onUpdateUser={onUpdateUser} 
              onCancel={() => setViewMode("dashboard")} 
            />
          </div>
        ) : viewMode === "econometrics" ? (
          <EconometricsPage onBack={() => setViewMode("dashboard")} />
        ) : viewMode === "dashboard" ? (
          <div>
            <div className="sp-dashboard__header">
              <Library size={24} className="sp-dashboard__icon" />
              <h2 className="sp-dashboard__title">
                Mis Cursos Matriculados
              </h2>
            </div>
            {cursos.length === 0 ? (
              <div className="empty-state">
                No estás matriculado en ningún curso aún.
              </div>
            ) : (
              <div className="sp-courses-grid">
                {cursos.map((c) => (
                  <div
                    key={c.id}
                    className="card sp-course-card"
                    onClick={() => {
                      setCursoActivo(c);
                      setViewMode("curso");
                    }}
                  >
                    <div className="sp-course-card__tag">
                      <ClipboardList size={18} />{" "}
                      <span className="sp-course-card__label">
                        Curso
                      </span>
                    </div>
                    <h3 className="sp-course-card__name">
                      {c.nombre}
                    </h3>
                  </div>
                ))}
              </div>
            )}

            {/* Econometrics Tool Card Removed */}
          </div>
        ) : (
          <div className="sp-course-detail">
            {/* Header & Tabs */}
            <div className="sp-course-detail__header">
              <div className="sp-course-detail__header-left">
                <button
                  className="btn btn-sm btn-ghost sp-course-back-btn"
                  onClick={() => {
                    setViewMode("dashboard");
                    setRegistered(null);
                    setInputCode("");
                  }}
                >
                  « Volver
                </button>
                <h2 className="sp-course-detail__title">
                  {cursoActivo?.nombre}
                </h2>
              </div>
              <div className="tabs tabs--inline">
                <button
                  className={`tab ${activeTab === "marcar" ? "active" : ""}`}
                  onClick={() => setActiveTab("marcar")}
                >
                  <CheckCircle size={16} /> Marcar
                </button>
                <button
                  className={`tab ${activeTab === "historial" ? "active" : ""}`}
                  onClick={() => setActiveTab("historial")}
                >
                  <History size={16} /> Historial
                </button>
                {cursoActivo?.nombre?.toLowerCase().includes('econometría') && (
                  <button
                    className={`tab ${activeTab === "econometria" ? "active" : ""}`}
                    onClick={() => setActiveTab("econometria")}
                  >
                    <BarChart3 size={16} /> Estimador
                  </button>
                )}
              </div>
            </div>

            {activeTab === "econometria" ? (
              <div className="sp-eco-wrapper">
                <EconometricsPage onBack={() => setActiveTab("marcar")} />
              </div>
            ) : activeTab === "historial" ? (
              <div className="attendance-list">
                <h3 className="sp-historial-title">
                  Historial
                </h3>
                {historial.filter((h) => h.curso_id === cursoActivo.id)
                  .length === 0 ? (
                  <p className="text-muted text-center mt-4">
                    No hay asistencias.
                  </p>
                ) : (
                  historial
                    .filter((h) => h.curso_id === cursoActivo.id)
                    .map((h) => (
                      <div 
                        key={h.id} 
                        className="attendance-item sp-historial-item"
                      >
                        <span
                          className="badge-status sp-historial-badge"
                          style={{
                            background: h.color ? `color-mix(in srgb, ${h.color} 15%, transparent)` : "#f1f5f9",
                            border: `1px solid ${h.color || '#cbd5e1'}`,
                            color: h.color || "#64748b",
                          }}
                        >
                          {h.tipo === 'puntos' ? `${h.valor >= 0 ? '+' : ''}${h.valor ?? 0}` : h.estado}
                        </span>
                        <div
                          className="attendance-item-info sp-historial-item__meta"
                        >
                          {h.tipo === 'clase' ? (
                            <div className="sp-historial-item__date-group">
                              <span className="sp-historial-item__date">{fmtFecha(h.fecha_hora)}</span>
                              <span className="sp-historial-item__class-name">{h.nombre_clase}</span>
                            </div>
                          ) : (
                            <span className="fw-600">{h.nombre_clase}</span>
                          )}
                          {h.tipo === 'clase' && (
                            <span className="attendance-item-time">{fmtHora(h.fecha_hora)}</span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <div className="sp-marcar-grid">
                {/* Scheduled Sessions */}
                <div className="sp-sessions-col">
                  <h3 className="sp-section-label">
                    <div className="sp-section-label__bar"></div>
                    Clases Programadas
                  </h3>
                  {sesionesCurso.length === 0 ? (
                    <div className="card">No hay clases.</div>
                  ) : (
                    sesionesCurso.map((s) => {
                      const sDate = s.fecha_programada
                        ? new Date(s.fecha_programada)
                        : new Date(s.fecha_inicio);
                      const isToday =
                        sDate.toDateString() === currentTime.toDateString();
                      return (
                         <div
                           key={s.id}
                           className={`card sp-session-card${isToday ? ' sp-session-card--today' : ''}`}
                         >
                           <div className="sp-session-card__row">
                             <div>
                               <div className="sp-session-card__name">{s.nombre_clase}</div>
                               <div className="sp-session-card__date">{fmtFecha(sDate)} • {fmtHora(sDate)}</div>
                             </div>
                             {isToday && (
                               <span className="sp-badge-today">
                                 Hoy
                               </span>
                             )}
                           </div>
                         </div>
                       );
                    })
                  )}
                </div>

                {/* Mark Panel */}
                <div className="sp-mark-col">
                  <h3 className="sp-section-label">
                    <div className="sp-section-label__bar"></div>
                    Registro
                  </h3>

                  <div className="alert alert-info sp-alert-row">
                    <div className="sp-time-display">
                      <Clock size={16} />
                      <div className="sp-time-text">
                        Hora:{" "}
                        <strong>{currentTime.toLocaleTimeString("es-MX")}</strong>
                      </div>
                    </div>
                    {estado && (
                      <span className={`badge-status badge-status--sm ${estado.toLowerCase()}`}>
                        {estado}
                      </span>
                    )}
                  </div>

                  {sesionActiva && sesionActiva.curso_id === cursoActivo.id && sesionActiva.tipo !== 'puntos' && (
                    <div className="alert alert-success animate-pulse">
                      <Radio size={16} className="live-dot" />
                      <div>
                        <strong>Clase en Vivo:</strong>{" "}
                        {sesionActiva.nombre_clase}
                        <br />
                        <span style={{ fontSize: "var(--text-xs)" }}>
                          Código habilitado
                        </span>
                      </div>
                    </div>
                  )}

                  {registered ? (
                    <div className="card text-center">
                      <CheckCircle
                        size={48}
                        color="var(--success)"
                        style={{ margin: "1rem auto" }}
                      />
                      <div className="fw-700">
                        Asistencia Registrada
                      </div>
                      <div className="sp-registered-time">
                        {registered.hora} - {registered.estado}
                      </div>
                    </div>
                  ) : (
                    <>
                      {validStatuses.length === 0 && !registered && (
                        <div className="alert alert-error">
                          Fuera de horario. No se puede marcar asistencia.
                        </div>
                      )}

                      {validStatuses.length > 0 && (
                        <div className="card">
                          <div className="card-title">Validación</div>
                          {step === STEPS.SCANNING ? (
                            <div>
                              <div
                                id="qr-reader"
                                className="sp-qr-reader"
                              />
                              <button
                                className="btn btn-ghost mt-2 btn-sm w-full"
                                onClick={stopScanner}
                              >
                                Cancelar Escaneo
                              </button>
                            </div>
                          ) : (
                            <div className="sp-scan-actions">
                              <button
                                className="btn btn-black w-full"
                                onClick={startScanner}
                                disabled={loading || !estado}
                              >
                                <QrCode
                                  size={16}
                                  style={{ marginRight: "6px" }}
                                />{" "}
                                Escanear QR
                              </button>

                              <div className="sp-or-divider">
                                O USA EL CÓDIGO
                              </div>

                              <input
                                placeholder="16 DIGITOS"
                                className="form-input sp-code-input"
                                value={inputCode}
                                onChange={(e) =>
                                  setInputCode(e.target.value.toUpperCase())
                                }
                                maxLength={16}
                              />
                              <button
                                className={`btn btn-sm w-full ${inputCode.length === 16 ? 'btn-success' : 'btn-ghost'}`}
                                onClick={() => handleQrScan(inputCode)}
                                disabled={
                                  loading || !estado || inputCode.length !== 16
                                }
                                style={{
                                  border: inputCode.length === 16 ? "none" : "1px solid var(--gray-200)",
                                }}
                              >
                                {loading ? (
                                  <div className="spinner" />
                                ) : (
                                  "Confirmar Código"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              {/* Modal de Asistencia (Mantener fuera para que cubra toda la pantalla si se quisiera) */}
          </div>
        )}
      </div>
      )}
      </div>
      <Footer simple={true} />
    </div>
  );
}
