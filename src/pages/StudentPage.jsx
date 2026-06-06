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
import Tabs from "../components/ui/Tabs";
import CourseCard from "../components/ui/CourseCard";
import Scanner from "../components/student/Scanner";
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

  const handleQrScan = async (decodedText) => {
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
                  <CourseCard
                    key={c.id}
                    title={c.nombre}
                    tagLabel="Curso"
                    tagIcon={ClipboardList}
                    baseClass="sp-course-card"
                    onClick={() => {
                      setCursoActivo(c);
                      setViewMode("curso");
                    }}
                  />
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
              <Tabs
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: "marcar", label: "Marcar", icon: CheckCircle },
                  { id: "historial", label: "Historial", icon: History },
                  ...(cursoActivo?.nombre?.toLowerCase().includes('econometría')
                    ? [{ id: "econometria", label: "Estimador", icon: BarChart3 }]
                    : [])
                ]}
              />
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
                            <Scanner
                              onScan={handleQrScan}
                              onCancel={() => setStep(STEPS.SELECT)}
                              loading={loading}
                              estado={estado}
                              inputCode={inputCode}
                              setInputCode={setInputCode}
                              STEPS={STEPS}
                              step={step}
                              setStep={setStep}
                              toast={toast}
                            />
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
