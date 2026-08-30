import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
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
  Star,
  Sparkles,
  Check,
} from "lucide-react";

import Tabs from "../components/ui/Tabs";
import CourseCard from "../components/ui/CourseCard";
import Scanner from "../components/student/Scanner";
import { api } from "../api/client";
import { toast } from "../components/Toast";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import ProfileView from "../components/ProfileView";
import Footer from "../components/Footer";
import EconometricsPage from "./EconometricsPage";
import '../styles/student.css';

const STEPS = { SELECT: "select", SCANNING: "scanning", DONE: "done" };

export default function StudentPage({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: courseIdParam } = useParams();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState("dashboard"); // dashboard | curso | perfil | econometrics
  const [cursos, setCursos] = useState([]);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [sesionActiva, setSesionActiva] = useState(null);
  const [sesionesCurso, setSesionesCurso] = useState([]);

  const [activeTab, setActiveTab] = useState("marcar"); // marcar | historial

  // Synchronize router location with viewMode, cursoActivo, and activeTab
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/courses/') && courseIdParam) {
      setViewMode("curso");
      const found = cursos.find(c => String(c.id) === String(courseIdParam));
      if (found) {
        setCursoActivo(found);
      } else {
        setCursoActivo((prev) => (prev && String(prev.id) === String(courseIdParam) ? prev : { id: Number(courseIdParam), nombre: `Curso ${courseIdParam}` }));
      }
      const tabParam = searchParams.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    } else if (path === '/profile') {
      setViewMode("perfil");
      setCursoActivo(null);
    } else if (path === '/econometrics') {
      setViewMode("econometrics");
      setCursoActivo(null);
    } else if (path === '/home' || path === '/dashboard' || path === '/courses' || path === '/') {
      setViewMode("dashboard");
      setCursoActivo(null);
    }
  }, [location.pathname, courseIdParam, searchParams, cursos]);
  const [step, setStep] = useState(STEPS.SELECT);
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialFilter, setHistorialFilter] = useState("todos");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [estadosDB, setEstadosDB] = useState([]);
  const [marcoEnSesionActual, setMarcoEnSesionActual] = useState(false);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);

  const cursoHistorial = useMemo(() => {
    return (historial || []).filter((h) => h.curso_id === cursoActivo?.id);
  }, [historial, cursoActivo?.id]);

  const totalPuntosAcumulados = useMemo(() => {
    return cursoHistorial
      .filter((h) => h.tipo === 'puntos')
      .reduce((sum, h) => sum + (Number(h.valor) || 0), 0);
  }, [cursoHistorial]);

  const totalClasesAsistidas = useMemo(() => {
    return cursoHistorial.filter((h) => (h.tipo || 'clase') === 'clase' && h.estado !== 'Falta' && h.estado !== 'Falto').length;
  }, [cursoHistorial]);

  const filteredHistorial = useMemo(() => {
    if (historialFilter === 'todos') return cursoHistorial;
    return cursoHistorial.filter((h) => (h.tipo || 'clase') === historialFilter);
  }, [cursoHistorial, historialFilter]);

  // Ref para evitar múltiples envíos simultáneos
  const isProcessingRef = useRef(false);

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

  // Time ticker
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cursos & Estados fetch
  useEffect(() => {
    api
      .getEstudianteCursos(user.id)
      .then((res) => {
        const list = Array.isArray(res?.cursos) ? res.cursos : [];
        setCursos(list.filter((c) => c.visible_alumnos !== false));
      })
      .catch(() => {});
    api
      .getEstados()
      .then((res) => setEstadosDB(res.estados))
      .catch(() => {});
  }, [user.id]);

  // Check for active session
  useEffect(() => {
    const checkSesion = () => {
      if (!cursoActivo?.id) {
        setSesionActiva(null);
        return;
      }
      api
        .getSesionActiva(cursoActivo.id)
        .then((res) => setSesionActiva(res.sesion))
        .catch(() => setSesionActiva(null));
    };
    checkSesion();
    const interval = setInterval(checkSesion, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [cursoActivo?.id]);

  // ── Helpers de caché en sessionStorage ─────────────────────────────
  // Clave: "asistencia_<sesionId>_<estudianteId>"  →  { estado, hora }
  // La caché vive mientras el tab esté abierto (sessionStorage).
  // Si el alumno ya marcó, las navegaciones dentro de la misma sesión
  // no generan ninguna petición al servidor.
  const cacheKey = (sesionId) => `asistencia_${sesionId}_${user.id}`;

  const readCache = (sesionId) => {
    try { return JSON.parse(sessionStorage.getItem(cacheKey(sesionId)) || 'null'); }
    catch { return null; }
  };

  const writeCache = (sesionId, data) => {
    try { sessionStorage.setItem(cacheKey(sesionId), JSON.stringify(data)); }
    catch { /* sessionStorage lleno o bloqueado — ignorar */ }
  };

  // Fetch Historial & Sesiones (tab historial) + verificación de asistencia (tab marcar)
  useEffect(() => {
    if (!cursoActivo) return;

    if (activeTab === "historial") {
      api
        .getHistorialAlumno(user.id)
        .then((res) => setHistorial(res.historial))
        .catch(() => toast.error("Error cargando historial"));
    }

    if (activeTab === "marcar") {
      // Sesiones de hoy
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

      if (!sesionActiva) {
        // Sin sesión activa: limpiar estado
        setMarcoEnSesionActual(false);
        setRegistered(null);
        return;
      }

      // ── 1. Revisar caché primero (respuesta instantánea) ─────────
      const cached = readCache(sesionActiva.id);
      if (cached) {
        setRegistered(cached);
        setMarcoEnSesionActual(true);
        // No necesitamos pedir nada al servidor
        return;
      }

      // ── 2. Sin caché → consulta ultraliviana al servidor ─────────
      // Un solo SELECT de 1 fila por clave primaria (sesion_id, estudiante_id).
      setIsCheckingAttendance(true);
      api
        .checkMiAsistencia(sesionActiva.id, user.id)
        .then((res) => {
          if (res.marcado) {
            const reg = {
              estado: res.estado,
              hora: new Date(res.hora).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            setRegistered(reg);
            setMarcoEnSesionActual(true);
            writeCache(sesionActiva.id, reg); // guardar en caché para navegaciones futuras
          } else {
            setMarcoEnSesionActual(false);
          }
        })
        .catch(() => setMarcoEnSesionActual(false))
        .finally(() => setIsCheckingAttendance(false));
    }
  }, [activeTab, user.id, cursoActivo, sesionActiva]);

  // Determine valid statuses based on rules
  const getValidStatuses = () => {
    if (sesionActiva?.tipo === 'evento') {
      return ['Participó'];
    }

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
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
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

      // Escribir en caché inmediatamente — próximas navegaciones son instantáneas
      if (sesionActiva?.id) writeCache(sesionActiva.id, reg);

      setRegistered(reg);
      setMarcoEnSesionActual(true);
      setStep(STEPS.DONE);
      toast.success("¡Asistencia registrada!");
    } catch (err) {
      toast.error(err.message);
      setStep(STEPS.SELECT);
      isProcessingRef.current = false;
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
        onOpenProfile={() => navigate("/profile")}
        onGoHome={() => navigate("/home")}
        extraOptions={
          viewMode === "curso" ? [
            {
              label: "Marcar Asistencia",
              icon: CheckCircle,
              onClick: () => { setActiveTab("marcar"); if (cursoActivo?.id) navigate(`/courses/${cursoActivo.id}?tab=marcar`, { replace: true }); },
              active: activeTab === "marcar"
            },
            {
              label: "Historial",
              icon: History,
              onClick: () => { setActiveTab("historial"); if (cursoActivo?.id) navigate(`/courses/${cursoActivo.id}?tab=historial`, { replace: true }); },
              active: activeTab === "historial"
            },
            ...(cursoActivo?.nombre?.toLowerCase().includes('econometría') ? [
              {
                label: "Estimador",
                icon: BarChart3,
                onClick: () => { setActiveTab("econometria"); if (cursoActivo?.id) navigate(`/courses/${cursoActivo.id}?tab=econometria`, { replace: true }); },
                active: activeTab === "econometria"
              }
            ] : [])
          ] : []
        }
      />

      {/* ── Bottom Navigation — mobile only ─────────── */}
      <BottomNav
        viewMode={viewMode}
        activeTab={activeTab}
        role="student"
        isAdmin={false}
        cursoActivoId={cursoActivo?.id || null}
        onLogout={onLogout}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (cursoActivo?.id) navigate(`/courses/${cursoActivo.id}?tab=${tab}`, { replace: true });
        }}
      />

      <div className="page-body sp-body">
        {viewMode === "perfil" ? (
          <div>
            <div className="sp-back-wrap">
              <button
                type="button"
                className="btn btn-sm btn-ghost sp-back-btn"
                onClick={() => navigate("/home")}
              >
                « Volver al Panel
              </button>
            </div>
            <ProfileView 
              user={user} 
              roleLabel="Estudiante"
              onUpdateUser={onUpdateUser} 
              onCancel={() => navigate("/home")} 
            />
          </div>
        ) : viewMode === "econometrics" ? (
          <EconometricsPage onBack={() => navigate("/home")} />
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
                      navigate(`/courses/${c.id}`);
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
              <div className="sp-course-detail__header-left" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  className="btn btn-sm btn-ghost sp-course-back-btn"
                  onClick={() => {
                    navigate("/home");
                    setRegistered(null);
                    setStep(STEPS.SELECT);
                  }}
                  style={{ whiteSpace: "nowrap", padding: "6px 12px", border: "1px solid var(--gray-200, #e2e8f0)", borderRadius: "10px" }}
                >
                  « Cursos
                </button>
                <h2 className="sp-course-detail__title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800" }}>
                  {cursoActivo?.nombre}
                </h2>
              </div>

              <Tabs
                activeTab={activeTab}
                onChange={(t) => {
                  setActiveTab(t);
                  if (cursoActivo?.id) {
                    navigate(`/courses/${cursoActivo.id}?tab=${t}`, { replace: true });
                  }
                }}
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
              <div className="sp-historial-container">
                {/* Header & Stats Banner */}
                <div className="sp-historial-stats-card">
                  <div className="sp-historial-stat-item">
                    <div className="sp-historial-stat-icon sp-historial-stat-icon--star">
                      <Star size={18} />
                    </div>
                    <div className="sp-historial-stat-val">
                      {totalPuntosAcumulados > 0 ? `+${totalPuntosAcumulados}` : totalPuntosAcumulados}
                    </div>
                    <div className="sp-historial-stat-lbl">Puntos</div>
                  </div>

                  <div className="sp-historial-stat-item">
                    <div className="sp-historial-stat-icon sp-historial-stat-icon--check">
                      <CheckCircle size={18} />
                    </div>
                    <div className="sp-historial-stat-val">
                      {totalClasesAsistidas}
                    </div>
                    <div className="sp-historial-stat-lbl">Asistencias</div>
                  </div>

                  <div className="sp-historial-stat-item">
                    <div className="sp-historial-stat-icon sp-historial-stat-icon--records">
                      <ClipboardList size={18} />
                    </div>
                    <div className="sp-historial-stat-val">
                      {cursoHistorial.length}
                    </div>
                    <div className="sp-historial-stat-lbl">Registros</div>
                  </div>
                </div>

                {/* Filtros por tipo (Chips) */}
                <div className="sp-historial-chips">
                  {[
                    { id: 'todos', label: 'Todos', count: cursoHistorial.length },
                    { id: 'clase', label: 'Clases', count: cursoHistorial.filter(h => (h.tipo || 'clase') === 'clase').length },
                    { id: 'puntos', label: '⭐ Puntos', count: cursoHistorial.filter(h => h.tipo === 'puntos').length },
                    { id: 'evento', label: '🎉 Eventos', count: cursoHistorial.filter(h => h.tipo === 'evento').length }
                  ].filter(tab => tab.id === 'todos' || tab.count > 0).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`sp-historial-chip ${historialFilter === tab.id ? 'is-active' : ''}`}
                      onClick={() => setHistorialFilter(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span className="sp-historial-chip-count">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {/* Lista de Registros */}
                <div className="sp-historial-list">
                  {filteredHistorial.length === 0 ? (
                    <div className="sp-historial-empty">
                      <div className="sp-historial-empty-icon">📋</div>
                      <h4>Sin registros aún</h4>
                      <p>
                        {historialFilter !== 'todos'
                          ? `No tienes registros en la categoría seleccionada.`
                          : "Aún no se han registrado asistencias ni puntos en este curso."}
                      </p>
                    </div>
                  ) : (
                    filteredHistorial.map((h) => {
                      const esPuntos = h.tipo === 'puntos';
                      const esEvento = h.tipo === 'evento';
                      const valPuntos = Number(h.valor) || 0;

                      return (
                        <div
                          key={h.id}
                          className={`sp-historial-card ${esPuntos ? 'sp-historial-card--puntos' : esEvento ? 'sp-historial-card--evento' : ''}`}
                        >
                          <div className="sp-historial-card-left">
                            <div className={`sp-historial-icon-circle ${esPuntos ? 'is-puntos' : esEvento ? 'is-evento' : ''}`}>
                              {esPuntos ? (
                                <Star size={18} />
                              ) : esEvento ? (
                                <Sparkles size={18} />
                              ) : (
                                <Clock size={18} />
                              )}
                            </div>
                            <div className="sp-historial-card-info">
                              <div className="sp-historial-card-title">
                                {h.nombre_clase || (esPuntos ? 'Puntos de Participación' : 'Sesión de Clase')}
                              </div>
                              <div className="sp-historial-card-date">
                                <span>{fmtFecha(h.fecha_hora)}</span>
                                {!esPuntos && h.fecha_hora && (
                                  <>
                                    <span className="sp-dot-sep">•</span>
                                    <span>{fmtHora(h.fecha_hora)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="sp-historial-card-right">
                            {esPuntos ? (
                              <div className={`sp-points-badge ${valPuntos >= 0 ? 'is-positive' : 'is-negative'}`}>
                                <Star size={13} />
                                <span>{valPuntos >= 0 ? `+${valPuntos}` : valPuntos} pts</span>
                              </div>
                            ) : esEvento ? (
                              <div className="sp-event-badge">
                                <Check size={13} />
                                <span>{h.estado || 'Participó'}</span>
                              </div>
                            ) : (
                              <div
                                className="sp-status-badge"
                                style={{
                                  background: h.color ? `color-mix(in srgb, ${h.color} 12%, transparent)` : "#f1f5f9",
                                  border: `1px solid ${h.color ? `color-mix(in srgb, ${h.color} 30%, transparent)` : '#cbd5e1'}`,
                                  color: h.color || "#475569",
                                }}
                              >
                                {h.estado}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="sp-marcar-grid">
                <div className="sp-mark-col">
                  <h3 className="sp-section-label">
                    <div className="sp-section-label__bar"></div>
                    Registro
                  </h3>

                  {/* <div className="alert alert-info sp-alert-row">
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
                  </div> */}

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
                      <div className="fw-700" style={{ fontSize: "var(--text-lg)", marginBottom: "0.5rem" }}>
                        ✓ Asistencia Confirmada
                      </div>
                      <div className="sp-registered-status" style={{ marginBottom: "1rem" }}>
                        <span
                          className="badge-status"
                          style={{
                            background: ESTADO_COLORS[registered.estado]?.bg || "#e0e7ff",
                            color: ESTADO_COLORS[registered.estado]?.color || "#4f46e5",
                            padding: "0.5rem 1rem",
                            borderRadius: "0.5rem",
                            display: "inline-block",
                            fontSize: "var(--text-sm)",
                            fontWeight: "600",
                          }}
                        >
                          {registered.estado}
                        </span>
                      </div>
                      <div className="sp-registered-time">
                        Hora: <strong>{registered.hora}</strong>
                      </div>
                      <p style={{ fontSize: "var(--text-sm)", color: "#64748b", marginTop: "1rem" }}>
                        No puedes marcar nuevamente en esta sesión
                      </p>
                    </div>
                  ) : (
                    <>
                      {validStatuses.length === 0 && !registered && (
                        <div className="alert alert-error">
                          Fuera de horario. No se puede marcar asistencia.
                        </div>
                      )}

                      {validStatuses.length > 0 && !isCheckingAttendance && !marcoEnSesionActual && (
                        <div className="card">
                          <Scanner
                            onScan={handleQrScan}
                            onCancel={() => setStep(STEPS.SELECT)}
                            loading={loading}
                            estado={estado}
                            STEPS={STEPS}
                            step={step}
                            setStep={setStep}
                            toast={toast}
                            disabled={marcoEnSesionActual}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
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
          </div>
        )}
      </div>
      )}
      </div>
      <Footer simple={true} />
    </div>
  );
}
