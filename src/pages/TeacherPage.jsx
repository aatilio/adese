import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  StopCircle,
  LogOut,
  ClipboardList,
  Users,
  History,
  Radio,
  Settings,
  BookOpen,
  Calendar,
  Trash2,
  Play,
  UserPlus,
  X,
  Edit,
  Search,
  Download,
  FileSpreadsheet,
  Check,
  Library,
  User,
  Pencil,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "../api/client";
import { ROL } from "../constants/roles";
import { toast } from "../components/Toast";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CourseCard from "../components/ui/CourseCard";
import Tabs from "../components/ui/Tabs";
import Modal from "../components/ui/Modal";
import SessionRow from "../components/teacher/SessionRow";
import DataTable from "../components/teacher/DataTable";
import QrGenerator from "../components/QrGenerator";
import AttendanceTable from "../components/AttendanceTable";
import ProfileView from "../components/ProfileView";
import ExcelIcon from "../assets/excel.svg";
import "../styles/table-modelo.css";
import "../styles/teacher.css";

export default function TeacherPage({ user, onLogout, isAdmin = false, onUpdateUser }) {
  // ── Course-level state ──────────────────────────────────
  const [cursos, setCursos] = useState([]);
  const [searchCursoQuery, setSearchCursoQuery] = useState("");
  const filteredCursos = useMemo(() => {
    if (!searchCursoQuery.trim()) return cursos;
    const lowerQuery = searchCursoQuery.toLowerCase();
    return cursos.filter(c => 
      (c.nombre || "").toLowerCase().includes(lowerQuery) || 
      (c.profesor_nombre || "").toLowerCase().includes(lowerQuery) ||
      (c.profesor_codigo || "").toLowerCase().includes(lowerQuery)
    );
  }, [cursos, searchCursoQuery]);

  const [cursoActivo, setCursoActivo] = useState(null);
  const [showNewCurso, setShowNewCurso] = useState(false);
  const [editingCurso, setEditingCurso] = useState(null);
  const [newCursoName, setNewCursoName] = useState("");
  const [profesores, setProfesores] = useState([]);
  const [selectedProfesoresIds, setSelectedProfesoresIds] = useState([]);

  // ── Tab state ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("vivo"); // vivo | alumnos | clases | historial | config
  const [viewMode, setViewMode] = useState("dashboard"); // dashboard | curso

  // ── Live session ────────────────────────────────────────
  const [sesion, setSesion] = useState(null);
  const [nombreClase, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [asistencias, setAsistencias] = useState([]);
  const [checking, setChecking] = useState(true);

  // ── Data per tab ────────────────────────────────────────
  const [estudiantesCurso, setEstudiantesCurso] = useState([]);
  const [todosEstudiantes, setTodosEstudiantes] = useState([]);
  const [sesionesProgr, setSesionesProgr] = useState([]);
  const [historialGen, setHistorialGen] = useState([]);

  const [estadosDB, setEstadosDB] = useState([]);
  
  // ── Modal Estados ───────────────────────────────────────
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [editEstado, setEditEstado] = useState(null);
  const [estadoData, setEstadoData] = useState({ nombre: "", color: "#3B82F6", puntuacion: 0 });

  const handleEditEstado = (est) => {
    setEditEstado(est);
    setEstadoData({ nombre: est.nombre, color: est.color, puntuacion: est.puntuacion });
    setShowEstadoModal(true);
  };

  const handleNewEstado = () => {
    setEditEstado(null);
    setEstadoData({ nombre: "Nuevo Estado", color: "#6B7280", puntuacion: 0 });
    setShowEstadoModal(true);
  };

  const saveEstado = async (e) => {
    e.preventDefault();
    try {
      if (editEstado) {
        await api.updateEstado(editEstado.id, {
          nombre: estadoData.nombre,
          color: estadoData.color,
          puntuacion: parseFloat(estadoData.puntuacion),
        });
        setEstadosDB((prev) =>
          prev.map((s) =>
            s.id === editEstado.id
              ? { ...s, ...estadoData, puntuacion: parseFloat(estadoData.puntuacion) }
              : s
          )
        );
        toast.success(`"${estadoData.nombre}" actualizado`);
      } else {
        const { estado } = await api.crearEstado({
          nombre: estadoData.nombre,
          color: estadoData.color,
          puntuacion: parseFloat(estadoData.puntuacion),
        });
        setEstadosDB((prev) => [...prev, estado]);
        toast.success("Estado creado exitosamente");
      }
      setShowEstadoModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── New class scheduling ────────────────────────────────
  const [newClaseName, setNewClaseName] = useState("");
  const [newClaseDate, setNewClaseDate] = useState("");
  const [showLimits, setShowLimits] = useState(false);
  const [limPuntual, setLimPuntual] = useState("");
  const [limPresente, setLimPresente] = useState("");
  const [limTarde, setLimTarde] = useState("");
  const [permitirFalto, setPermitirFalto] = useState(true);
  const [showAddSesion, setShowAddSesion] = useState(false);
  const [newClaseTipo, setNewClaseTipo] = useState('clase');
  const [newClaseVisible, setNewClaseVisible] = useState(true);

  const [editingSesion, setEditingSesion] = useState(null);
  const [editSesionData, setEditSesionData] = useState({
    nombre_clase: "",
    fecha_programada: "",
    limite_puntual: "",
    limite_presente: "",
    limite_tarde: "",
    permitir_falto: true,
    tipo: "clase",
    visible_alumnos: true,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchHistorial, setSearchHistorial] = useState("");

  // ── Nuevo Alumno modal state ─────────────────────────────
  const [showNuevoAlumno, setShowNuevoAlumno] = useState(false);
  const [nuevoAlumnoCodigo, setNuevoAlumnoCodigo] = useState('');
  const [nuevoAlumnoNombre, setNuevoAlumnoNombre] = useState('');
  const [nuevoAlumnoEncontrado, setNuevoAlumnoEncontrado] = useState(null);
  const [buscandoAlumno, setBuscandoAlumno] = useState(false);
  const [csvImportando, setCsvImportando] = useState(false);
  const [editingAlumnoData, setEditingAlumnoData] = useState(null);

  // ── Init: load courses ──────────────────────────────────
  useEffect(() => {
    api
      .getCursos(isAdmin ? '' : `?profesor_id=${user.id}`)
      .then((res) => {
        setCursos(res.cursos);
        if (res.cursos.length > 0) setCursoActivo(res.cursos[0]);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    // Load estados de asistencia (globales + del profesor)
    api
      .getEstados(user.id)
      .then((res) => setEstadosDB(res.estados))
      .catch(() => {});
  }, []);

  // ── Init: load professors (only for admin) ──────────────
  const reloadProfesores = () => {
    if (!isAdmin) return;
    api
      .getUsuarios()
      .then((res) => {
        const profs = res.usuarios.filter((u) => Number(u.rol) === 2);
        setProfesores(profs);
      })
      .catch(() => {});
  };

  const reloadCursos = () => {
    api
      .getCursos(isAdmin ? '' : `?profesor_id=${user.id}`)
      .then((res) => {
        setCursos(res.cursos);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isAdmin) {
      reloadProfesores();
    }
  }, [isAdmin]);

  // ── Load active session ─────────────────────────────────
  useEffect(() => {
    if (!cursoActivo?.id) {
      setSesion(null);
      return;
    }
    api
      .getSesionActiva(cursoActivo.id)
      .then((res) => setSesion(res.sesion))
      .catch(() => setSesion(null));
  }, [cursoActivo?.id]);

  // ── Fetch tab data when tab or course changes ───────────
  useEffect(() => {
    if (!cursoActivo) return;
    const id = cursoActivo.id;

    if (activeTab === "alumnos") {
      Promise.all([api.getCursoEstudiantes(id), api.getEstudiantes()]).then(
        ([resC, resA]) => {
          setEstudiantesCurso(resC.estudiantes);
          setTodosEstudiantes(
            resA.estudiantes.filter((e) => Number(e.rol) === ROL.ALUMNO || Number(e.rol) === ROL.ESTUDIANTE),
          );
        },
      );
    } else if (activeTab === "clases") {
      api.getCursoSesiones(id).then((res) => setSesionesProgr(res.sesiones));
    } else if (activeTab === "historial") {
      Promise.all([
        api.getCursoHistorial(id),
        api.getCursoEstudiantes(id),
      ]).then(([resH, resE]) => {
        // No transformar: usar los datos tal como vienen del API
        setHistorialGen(resH.historial);
        setEstudiantesCurso(resE.estudiantes);
      });
    } else if (activeTab === "config") {
      api
        .getEstados(user.id)
        .then((res) => setEstadosDB(res.estados))
        .catch(() => {});
    }
  }, [activeTab, cursoActivo]);

  // ── Auto-refresh QR Token every 60s ─────────────────────
  useEffect(() => {
    let interval;
    if (sesion?.id && sesion?.activa) {
      interval = setInterval(async () => {
        try {
          const res = await api.refrescarToken(sesion.id);
          // Actualización segura de la sesión
          if (res?.sesion) {
            setSesion(res.sesion);
          }
        } catch (err) {
          console.error("Error al refrescar token:", err.message);
        }
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sesion?.id, sesion?.activa]);

  // ── Actions ─────────────────────────────────────────────
  const crearCurso = async (e) => {
    e.preventDefault();
    if (!newCursoName.trim()) return;
    if (isAdmin && selectedProfesoresIds.length === 0) {
      toast.error("Por favor, selecciona al menos un profesor para el curso");
      return;
    }
    try {
      const pIds = isAdmin ? selectedProfesoresIds : [user.id];
      const { curso } = await api.crearCurso({ nombre: newCursoName.trim(), profesores_ids: pIds });
      
      const selectedProfs = profesores.filter(p => pIds.includes(p.id));
      const newCursoFormatted = { 
        ...curso, 
        total_alumnos: 0, 
        total_clases: 0,
        profesor_nombre: selectedProfs.map(p => p.nombre_completo).join(', '),
        profesor_codigo: selectedProfs.map(p => p.codigo).join(', ')
      };

      setCursos((prev) => [newCursoFormatted, ...prev]);
      setCursoActivo(newCursoFormatted);
      setNewCursoName("");
      setSelectedProfesoresIds([]);
      setShowNewCurso(false);
      setViewMode("curso");
      toast.success(`Curso "${curso.nombre}" creado`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateCurso = async (e) => {
    e.preventDefault();
    if (!editingCurso || !newCursoName.trim()) return;
    if (isAdmin && selectedProfesoresIds.length === 0) {
      toast.error("Por favor, selecciona al menos un profesor para el curso");
      return;
    }
    try {
      const pIds = isAdmin ? selectedProfesoresIds : []; // If not admin, do not change teachers
      const { curso } = await api.updateCurso(editingCurso.id, {
        nombre: newCursoName.trim(),
        profesores_ids: pIds
      });
      
      const selectedProfs = profesores.filter(p => pIds.includes(p.id));
      const updatedFormatted = { 
        ...curso, 
        total_alumnos: editingCurso.total_alumnos, 
        total_clases: editingCurso.total_clases,
        profesor_nombre: selectedProfs.length > 0 ? selectedProfs.map(p => p.nombre_completo).join(', ') : editingCurso.profesor_nombre,
        profesor_codigo: selectedProfs.length > 0 ? selectedProfs.map(p => p.codigo).join(', ') : editingCurso.profesor_codigo
      };

      setCursos((prev) => prev.map((c) => (c.id === curso.id ? updatedFormatted : c)));
      if (cursoActivo?.id === curso.id) setCursoActivo(updatedFormatted);
      setNewCursoName("");
      setSelectedProfesoresIds([]);
      setEditingCurso(null);
      toast.success("Curso actualizado");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const eliminarCurso = async (id) => {
    if (!confirm("¿Eliminar este curso y todas sus clases programadas?"))
      return;
    try {
      await api.deleteCurso(id);
      const updated = cursos.filter((c) => c.id !== id);
      setCursos(updated);
      setCursoActivo(updated[0] || null);
      toast.info("Curso eliminado");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addAlumno = async (estudianteId) => {
    try {
      await api.addEstudianteCurso(cursoActivo.id, estudianteId);
      const res = await api.getCursoEstudiantes(cursoActivo.id);
      setEstudiantesCurso(res.estudiantes);
      toast.success("Alumno añadido al curso");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeAlumno = async (estudianteId) => {
    try {
      await api.removeEstudianteCurso(cursoActivo.id, estudianteId);
      setEstudiantesCurso((prev) => prev.filter((e) => e.id !== estudianteId));
      toast.info("Alumno removido del curso");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const programarClase = async (e) => {
    e.preventDefault();
    if (!newClaseName.trim() || !newClaseDate) return;
    try {
      const sesionData = {
        nombre_clase: newClaseName.trim(),
        fecha_programada: new Date(newClaseDate).toISOString(),
        tipo: newClaseTipo,
        visible_alumnos: newClaseVisible,
        profesor_id: user.id
      };
      
      // Solo agregar límites si es tipo 'clase'
      if (newClaseTipo === 'clase') {
        sesionData.limite_puntual = limPuntual || undefined;
        sesionData.limite_presente = limPresente || undefined;
        sesionData.limite_tarde = limTarde || undefined;
        sesionData.permitir_falto = permitirFalto;
      }
      
      const { sesion } = await api.crearCursoSesion(cursoActivo.id, sesionData);
      
      // Si es PUNTOS: crear asistencias para todos los estudiantes automáticamente
      if (newClaseTipo === 'puntos' && estudiantesCurso.length > 0) {
        for (const est of estudiantesCurso) {
          try {
            await api.crearAsistenciaManual({
              estudiante_id: est.id,
              sesion_id: sesion.id,
              estado: 'Participó',
            });
          } catch (err) {
            console.error(`Error creando asistencia para ${est.id}:`, err.message);
          }
        }
      }
      
      // El evento ahora se activa manualmente, no de forma automática
      
      const res = await api.getCursoSesiones(cursoActivo.id);
      setSesionesProgr(res.sesiones);
      setNewClaseName("");
      setNewClaseDate("");
      setShowLimits(false);
      setShowAddSesion(false);
      setNewClaseTipo('clase');
      setNewClaseVisible(true);
      setLimPuntual("");
      setLimPresente("");
      setLimTarde("");
      setPermitirFalto(true);
      toast.success(newClaseTipo === 'puntos' ? "¡Puntos creados y agregados al historial!" : newClaseTipo === 'evento' ? "¡Evento iniciado! QR activo." : "Clase programada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEditForm = (sesion) => {
    setEditingSesion(sesion.id);
    let formattedDate = "";
    if (sesion.fecha_programada) {
      const d = new Date(sesion.fecha_programada);
      const yyyy = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      formattedDate = `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    } else if (sesion.fecha_inicio) {
      const d = new Date(sesion.fecha_inicio);
      const yyyy = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      formattedDate = `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    }

    setEditSesionData({
      nombre_clase: sesion.nombre_clase || "",
      fecha_programada: formattedDate,
      limite_puntual: sesion.limite_puntual || "",
      limite_presente: sesion.limite_presente || "",
      limite_tarde: sesion.limite_tarde || "",
      permitir_falto: sesion.permitir_falto ?? true,
      tipo: sesion.tipo || "clase",
      visible_alumnos: sesion.visible_alumnos ?? true,
    });
  };

  const saveEditedSesion = async (e) => {
    e.preventDefault();
    if (!editSesionData.nombre_clase.trim() || !editSesionData.fecha_programada)
      return;
    try {
      await api.updateSesion(editingSesion, {
        nombre_clase: editSesionData.nombre_clase.trim(),
        fecha_programada: new Date(
          editSesionData.fecha_programada,
        ).toISOString(),
        limite_puntual: editSesionData.limite_puntual,
        limite_presente: editSesionData.limite_presente,
        limite_tarde: editSesionData.limite_tarde,
        permitir_falto: editSesionData.permitir_falto,
        visible_alumnos: editSesionData.visible_alumnos,
      });
      const res = await api.getCursoSesiones(cursoActivo.id);
      setSesionesProgr(res.sesiones);
      setEditingSesion(null);
      toast.success("Clase actualizada con éxito");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const activarSesion = async (sesionId, tipo) => {
    try {
      const { sesion: s } = await api.activarSesion(sesionId);
      setSesion(s);
      // SOLO para CLASE mostrar el monitor QR; EVENTO ya está activo, PUNTOS no lo necesita
      if (tipo === 'clase') {
        setActiveTab("vivo");
        toast.success("¡Sesión iniciada! QR activo.");
      } else if (tipo === 'puntos') {
        toast.success("¡Puntos activados!");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cerrarSesion = async () => {
    if (!sesion) return;
    if (!confirm("¿Cerrar la sesión actual?")) return;
    try {
      // Si es EVENTO: marcar FALTA a todos los no registrados
      if (sesion.tipo === 'evento') {
        const registrados = new Set(asistencias.map(a => a.estudiante_id));
        for (const est of estudiantesCurso) {
          if (!registrados.has(est.id)) {
            try {
              await api.crearAsistenciaManual({
                estudiante_id: est.id,
                sesion_id: sesion.id,
                estado: 'Falto',
              });
            } catch (err) {
              console.error(`Error marcando falta a ${est.id}:`, err.message);
            }
          }
        }
      }
      
      await api.terminarSesion(sesion.id);
      setSesion(null);
      setAsistencias([]);
      toast.info("Sesión terminada y guardada.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const eliminarSesionProgramada = (id) => {
    setConfirmDeleteId(id); // abre el modal de confirmación
  };

  const confirmarEliminar = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await api.cerrarSesion(id);
      setSesionesProgr((prev) => prev.filter((s) => s.id !== id));
      toast.info("Clase eliminada");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const crearSesionLive = async (e) => {
    e.preventDefault();
    if (!nombreClase.trim()) return;
    setLoading(true);
    try {
      const { sesion: s } = await api.crearSesion(
        nombreClase.trim(),
        cursoActivo.id,
        user.id,
        'clase',
        true
      );
      setSesion(s);
      setAsistencias([]);
      toast.success(`Sesión "${s.nombre_clase}" iniciada`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!sesion?.id) return;
    try {
      const res = await api.refrescarToken(sesion.id);
      if (res?.sesion) {
        setSesion(res.sesion);
        toast.success("Código QR renovado manualmente");
      }
    } catch (err) {
      toast.error("Error al renovar código: " + err.message);
    }
  };

  const updateAsistenciaEstado = async (id, estado) => {
    const ast = historialGen.find((a) => a.id === id);
    if (!ast || ast.estado === estado) return;
    try {
      await api.updateAsistencia(id, { estado });
      setHistorialGen((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado } : a)),
      );
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const createAsistenciaManual = async (estudiante_id, sesion_id, estado) => {
    try {
      await api.crearAsistenciaManual({ estudiante_id, sesion_id, estado });
      const res = await api.getCursoHistorial(cursoActivo.id);
      setHistorialGen(res.historial);
      toast.success("Asistencia registrada");
    } catch {
      toast.error("Error al registrar asistencia");
    }
  };

  // ── Nuevo Alumno functions ───────────────────────────────
  const buscarAlumnoPorCodigo = async (codigo) => {
    setNuevoAlumnoCodigo(codigo);
    if (!codigo.trim() || codigo.trim().length < 2) { setNuevoAlumnoEncontrado(null); return; }
    setBuscandoAlumno(true);
    try {
      const res = await api.buscarUsuario(codigo.trim());
      setNuevoAlumnoEncontrado(res.usuario || null);
      if (res.usuario) setNuevoAlumnoNombre(res.usuario.nombre_completo);
    } catch { setNuevoAlumnoEncontrado(null); }
    finally { setBuscandoAlumno(false); }
  };

  const crearYAgregarAlumno = async (e) => {
    e.preventDefault();
    if (!nuevoAlumnoCodigo.trim()) return;
    
    if (nuevoAlumnoEncontrado) {
      const yaMatriculado = estudiantesCurso.some(est => est.id === nuevoAlumnoEncontrado.id);
      if (yaMatriculado) {
        toast.error("El alumno ya está matriculado en este curso.");
        return;
      }
    }

    try {
      let estudianteId;
      if (nuevoAlumnoEncontrado) {
        estudianteId = nuevoAlumnoEncontrado.id;
      } else {
        const { usuario } = await api.crearUsuario({ codigo: nuevoAlumnoCodigo.trim(), nombre_completo: nuevoAlumnoNombre.trim(), rol: 3 });
        estudianteId = usuario.id;
      }
      await api.addEstudianteCurso(cursoActivo.id, estudianteId);
      const res = await api.getCursoEstudiantes(cursoActivo.id);
      setEstudiantesCurso(res.estudiantes);
      setShowNuevoAlumno(false); setNuevoAlumnoCodigo(''); setNuevoAlumnoNombre(''); setNuevoAlumnoEncontrado(null);
      toast.success('Alumno añadido al curso');
    } catch (err) { toast.error(err.message); }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvImportando(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const header = lines[0].toLowerCase();
      const isAdese = header.includes('user') || header.includes('codigo');
      const alumnos = [];
      const start = isAdese ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 2) continue;
        const codigo = cols[0].trim();
        const nombre = cols[1].trim();
        if (codigo && nombre) alumnos.push({ codigo, nombre_completo: nombre });
      }
      if (alumnos.length === 0) { toast.error('No se encontraron alumnos en el CSV'); return; }
      const res = await api.importarAlumnos(cursoActivo.id, alumnos);
      const resE = await api.getCursoEstudiantes(cursoActivo.id);
      setEstudiantesCurso(resE.estudiantes);
      toast.success(`Importados: ${res.creados} nuevos, ${res.existentes} ya existían, ${res.vinculados} vinculados`);
    } catch (err) { toast.error(err.message); }
    finally { setCsvImportando(false); e.target.value = ''; }
  };

  const updateEstudiante = async (id, field, value) => {
    const est = estudiantesCurso.find((e) => e.id === id);
    if (!est || est[field] === value) return;
    const payload = { ...est, [field]: value };
    try {
      await api.updateEstudiante(id, payload);
      setEstudiantesCurso((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      );
      toast.success("Alumno actualizado");
    } catch {
      toast.error("Error al actualizar alumno");
    }
  };

  // ── Derived data for matrix ─────────────────────────────
  const clasesColumns = useMemo(() => {
    const clsMap = new Map();
    historialGen.forEach((a) => {
      const dt = new Date(a.fecha_hora);
      clsMap.set(a.sesion_id, {
        id: a.sesion_id,
        name: a.nombre_clase,
        tipo: a.tipo || 'clase',
        dt: dt.getTime(),
        // Para EVENTO y PUNTOS: mostrar el nombre; para CLASE: mostrar la fecha
        label: (a.tipo === 'evento' || a.tipo === 'puntos') 
          ? a.nombre_clase 
          : dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
      });
    });
    return Array.from(clsMap.values()).sort((a, b) => a.dt - b.dt);
  }, [historialGen]);

  const alumnosNoInscritos = useMemo(() => {
    const ids = new Set(estudiantesCurso.map((e) => e.id));
    return todosEstudiantes.filter((e) => !ids.has(e.id));
  }, [todosEstudiantes, estudiantesCurso]);

  // Build ESTADOS_UI dynamically from database
  const ESTADOS_UI = useMemo(() => {
    const map = {};
    estadosDB.forEach((e) => {
      map[e.nombre] = {
        bg: `color-mix(in srgb, ${e.color} 15%, transparent)`,
        color: e.color,
        border: e.color,
        puntuacion: parseFloat(e.puntuacion),
      };
    });
    return map;
  }, [estadosDB]);

  // ── Helpers ─────────────────────────────────────────────
  const fmtFecha = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return `${date.toLocaleDateString("es-MX")} ${date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
  };

  if (checking) {
    return (
      <div className="app-shell tp-loading-shell">
        <div className="spinner tp-spinner-lg" />
      </div>
    );
  }

  // ── Export historial to Excel ────────────────────────────
  const exportToExcel = () => {
    if (
      !cursoActivo ||
      estudiantesCurso.length === 0 ||
      clasesColumns.length === 0
    ) {
      toast.error("No hay datos para exportar");
      return;
    }

    // Build header row: CUI | Nombre | date1 | date2 | ... | Puntuación
    const headers = [
      "CUI",
      "Nombre",
      ...clasesColumns.map((c) => c.label),
      "Puntuación",
    ];

    // Build data rows
    const rows = estudiantesCurso.map((est) => {
      const recs = historialGen.filter((h) => h.estudiante_id === est.id);
      const points = recs.reduce((acc, h) => {
        // Usar puntuacion (valor guardado en BD)
        return acc + (parseFloat(h.puntuacion) || 0);
      }, 0);

      const sesionValues = clasesColumns.map((c) => {
        const r = recs.find((h) => h.sesion_id === c.id);
        // Usar puntuacion (valor guardado en BD)
        return r ? Math.round(parseFloat(r.puntuacion) || 0) : "";
      });

      return [est.codigo, est.nombre_completo, ...sesionValues, Math.round(points)];
    });

    // Create workbook
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, // CUI
      { wch: 35 }, // Nombre
      ...clasesColumns.map(() => ({ wch: 14 })),
      { wch: 12 }, // Puntuación
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");

    // Generate filename based on session type
    const safeName = cursoActivo.nombre
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "")
      .trim();
    
    let filename;
    // Si hay sesión activa y es EVENTO o PUNTOS, no incluir fecha
    if (sesion && (sesion.tipo === 'evento' || sesion.tipo === 'puntos')) {
      filename = `${sesion.nombre_clase || safeName}.xlsx`;
    } else {
      // Para CLASE o sin sesión activa: incluir fecha
      const today = new Date().toISOString().slice(0, 10);
      filename = `Asistencias_${safeName}_${today}.xlsx`;
    }
    
    XLSX.writeFile(wb, filename);
    toast.success("Archivo Excel descargado");
  };

  return (
    <div className="app-shell">
      {/* ── Modal Confirmar Eliminar Sesión ──────────── */}
      {confirmDeleteId && (
        <div className="tp-modal-overlay">
          <div className="tp-confirm-box">
            <div className="tp-modal-icon">🗑️</div>
            <h3 className="tp-modal-title">¿Eliminar esta clase?</h3>
            <p className="tp-modal-body">
              Esta acción es{" "}
              <strong style={{ color: "var(--danger)" }}>irreversible</strong>.
              <br />
              Se eliminarán también todos los registros de asistencia asociados
              a esta clase.
            </p>
            <div className="tp-modal-actions">
              <button
                className="btn btn-ghost tp-flex-1"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger tp-flex-1"
                onClick={confirmarEliminar}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      <Header
        user={user}
        roleLabel={user.rol === 1 ? 'Administrador' : user.rol === 2 ? 'Profesor' : 'Alumno'}
        onLogout={onLogout}
        onOpenProfile={() => setViewMode("perfil")}
        extraOptions={
          viewMode === "curso"
            ? [
                {
                  label: "Monitor",
                  icon: Radio,
                  onClick: () => setActiveTab("vivo"),
                  active: activeTab === "vivo",
                },
                {
                  label: "Programación",
                  icon: Calendar,
                  onClick: () => setActiveTab("clases"),
                  active: activeTab === "clases",
                },
                {
                  label: "Alumnos",
                  icon: Users,
                  onClick: () => setActiveTab("alumnos"),
                  active: activeTab === "alumnos",
                },
                {
                  label: "Historial",
                  icon: History,
                  onClick: () => setActiveTab("historial"),
                  active: activeTab === "historial",
                },
                {
                  label: "Ajustes",
                  icon: Settings,
                  onClick: () => setActiveTab("config"),
                  active: activeTab === "config",
                },
              ]
            : []
        }
      />

      {/* PROFILE: Edit user data */}
      {viewMode === "perfil" ? (
        <div className="page-body">
          <div className="tp-back-wrap">
            <button
              type="button"
              className="btn btn-sm btn-ghost tp-back-btn"
              onClick={() => setViewMode("dashboard")}
            >
              « Volver
            </button>
          </div>
          <ProfileView 
            user={user} 
            roleLabel={user.rol === 1 ? 'Administrador' : 'Profesor'}
            onUpdateUser={onUpdateUser} 
            onCancel={() => setViewMode("dashboard")} 
          />
        </div>
      ) : viewMode === "dashboard" ? (
        <div className="tp-dashboard">
          <div className="tp-dashboard__header">
            <div className="tp-dashboard__title-group">
              <Library size={24} className="tp-dashboard__icon" />
              <h2 className="tp-dashboard__title">Mis Cursos</h2>
            </div>
            {isAdmin && (
              <button
                className="btn btn-sm btn-ghost tp-btn-usuarios"
                onClick={() => setViewMode("usuarios")}
              >
                <Users size={14} /> Usuarios
              </button>
            )}

          </div>

          {/* Buscador de Cursos */}
          <div className="tp-search-wrap">
            <Search size={18} className="tp-search-icon" />
            <input
              type="text"
              placeholder="Buscar curso..."
              value={searchCursoQuery}
              onChange={(e) => setSearchCursoQuery(e.target.value)}
              className="tp-search-input"
            />
          </div>

          {/* ── Add/Edit Course Modal ──────────────────────── */}
          {(showNewCurso || editingCurso) && (
            <div className="tp-modal-overlay--high" onClick={() => { setShowNewCurso(false); setEditingCurso(null); setSelectedProfesoresIds([]); }}>
              <div className="tp-modal-box--md" onClick={e => e.stopPropagation()}>
                <div className="tp-modal-header">
                  <h3 className="tp-modal-title-row">
                    {editingCurso ? (
                      <Edit size={18} className="tp-modal-icon-primary" />
                    ) : (
                      <Plus size={18} className="tp-modal-icon-primary" />
                    )}
                    {editingCurso ? "Editar Curso" : "Nuevo Curso"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewCurso(false);
                      setEditingCurso(null);
                      setSelectedProfesoresIds([]);
                    }}
                    className="tp-modal-close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={editingCurso ? updateCurso : crearCurso}>
                  <div className="tp-modal-body-pad">
                    <div className="form-group">
                      <label
                        className="form-label tp-modal-label"
                      >
                        Nombre del Curso
                      </label>
                      <input
                        className="form-input"
                        autoFocus
                        value={newCursoName}
                        onChange={(e) => setNewCursoName(e.target.value)}
                        placeholder="Ej: Programación I"
                        required
                      />
                    </div>
                    {isAdmin && (
                      <div className="form-group tp-form-group--mt">
                        <label
                          className="form-label tp-modal-label"
                        >
                          Asignar Profesor
                        </label>
                        <div 
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: "8px",
                            maxHeight: "200px",
                            overflowY: "auto",
                            padding: "4px",
                            border: "1px solid var(--gray-200)",
                            borderRadius: "8px"
                          }}
                        >
                          {profesores.map((p) => {
                            const isSelected = selectedProfesoresIds.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedProfesoresIds(prev => prev.filter(id => id !== p.id));
                                  } else {
                                    setSelectedProfesoresIds(prev => [...prev, p.id]);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  border: isSelected ? "1.5px solid #22c55e" : "1px solid transparent",
                                  background: isSelected ? "#f0fdf4" : "#f9fafb",
                                  transition: "all 0.1s"
                                }}
                              >
                                <span style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>
                                  {p.nombre_completo}
                                </span>
                                <div
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "4px",
                                    border: isSelected ? "2px solid #22c55e" : "2px solid var(--gray-300)",
                                    background: isSelected ? "#22c55e" : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  {isSelected && <Check size={10} color="white" />}
                                </div>
                              </div>
                            );
                          })}
                          {profesores.length === 0 && (
                            <div style={{ fontSize: "0.85rem", color: "var(--gray-400)", padding: "8px" }}>No hay docentes disponibles.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="tp-modal-footer">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowNewCurso(false);
                        setEditingCurso(null);
                        setSelectedProfesoresIds([]);
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingCurso ? "Guardar Cambios" : "Crear Curso"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!checking && (
            <div className="tp-courses-grid">
              {filteredCursos.map((c) => (
                <CourseCard
                  key={c.id}
                  title={c.nombre}
                  tagLabel="Curso"
                  tagIcon={BookOpen}
                  docente={isAdmin && c.profesor_codigo ? { nombre: c.profesor_nombre, codigo: c.profesor_codigo } : null}
                  onClick={() => {
                    setCursoActivo(c);
                    setViewMode("curso");
                  }}
                  actions={
                    <>
                      <button
                        className="btn btn-sm btn-ghost tp-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewCursoName(c.nombre);
                        const teacherIds = [];
                        if (c.profesor_nombre && c.profesor_nombre.includes(',')) {
                           // Try matching names since we don't return the IDs easily in GET /cursos, but let's query the teachers directly from their cursos_dictados
                           // Actually a simpler way is to filter `profesores` that have `c.id` in their `cursos_dictados`.
                           const enrolledTeachers = profesores.filter(p => (p.cursos_dictados || []).some(cd => cd.id === c.id));
                           enrolledTeachers.forEach(t => teacherIds.push(t.id));
                        } else {
                           const enrolledTeachers = profesores.filter(p => (p.cursos_dictados || []).some(cd => cd.id === c.id));
                           enrolledTeachers.forEach(t => teacherIds.push(t.id));
                        }
                        setSelectedProfesoresIds(teacherIds);
                          setEditingCurso(c);
                        }}
                        title="Editar curso"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost tp-icon-btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarCurso(c.id);
                        }}
                        title="Eliminar curso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  }
                  stats={
                    <>
                      <span className="tp-course-card__stat">
                        <Users size={14} /> {c.total_alumnos} Alumnos
                      </span>
                      <span className="tp-course-card__stat">
                        <Calendar size={14} /> {c.total_clases} Clases
                      </span>
                    </>
                  }
                />
              ))}

              {/* ── Sketch Card: Crear Curso ────────────────── */}
              <div
                className="card tp-add-course-card"
                onClick={() => {
                  setNewCursoName("");
                  setSelectedProfesoresIds([]);
                  setShowNewCurso(true);
                }}
              >
                <div className="tp-add-course-icon">
                  <Plus size={24} />
                </div>
                <span className="tp-add-course-text">Añadir Curso</span>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === "usuarios" ? (
        /* ══════ VISTA USUARIOS ══════════════════════ */
        <UsersView 
          onBack={() => setViewMode("dashboard")} 
          cursos={cursos} 
          onCursosUpdated={reloadCursos}
          onProfesoresUpdated={reloadProfesores}
        />
      ) : (
        <>
          {/* COURSE VIEW: Header & Tabs */}
          <div
            className="teacher-course-toolbar tp-toolbar-mb"
          >
            <h2
              className="teacher-course-title tp-course-view-title"
            >
              <span className="tp-course-subtitle">Curso</span>
              <span
                className="teacher-course-title-text tp-course-name"
              >
                {cursoActivo?.nombre}
              </span>
            </h2>
          </div>

          <div className="tp-tabs-bar">
            <button
              type="button"
              className="btn btn-sm btn-ghost tp-back-btn--tabs"
              onClick={() => setViewMode("dashboard")}
            >
              « Volver a Cursos
            </button>

            <Tabs
              className="tabs tp-tabs-inline"
              tabClass="tab tp-tab--compact"
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "vivo", label: "Monitor", icon: Radio },
                { id: "clases", label: "Programación", icon: Calendar },
                { id: "alumnos", label: "Alumnos", icon: Users },
                { id: "historial", label: "Historial", icon: History },
              ]}
            />
          </div>

          <div className="page-body tp-page-body-full">
            {/* ─── MONITOR EN VIVO ─────────────────────── */}
            {activeTab === "vivo" &&
              (!sesion || sesion.curso_id !== cursoActivo?.id ? (
                <div
                  className="card tp-no-session-card"
                >
                  <Calendar
                    size={48}
                    className="tp-no-session-icon"
                  />
                  <div
                    className="card-title tp-no-session-title"
                  >
                    No hay una sesión activa
                  </div>
                  <p
                    className="tp-no-session-body"
                  >
                    Para generar el código QR y recibir asistencias, debes
                    iniciar una clase programada desde la pestaña de{" "}
                    <strong>Clases</strong>.
                  </p>
                  <button
                    className="btn btn-primary tp-btn-go-classes"
                    onClick={() => setActiveTab("clases")}
                  >
                    <Calendar size={16} className="tp-btn-icon-mr" /> Ir a
                    Mis Clases
                  </button>
                </div>
              ) : (
                <div className="teacher-live-grid">
                  <div className="teacher-live-col-qr">
                    <div className="session-chip session-chip--live">
                      <div className="tp-live-chip-row">
                        <span className="live-dot" />{" "}
                        <strong>{sesion?.nombre_clase || "Cargando..."}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm session-chip-end"
                        onClick={cerrarSesion}
                      >
                        <StopCircle size={13} /> Terminar
                      </button>
                    </div>
                    <div className="card teacher-qr-card">
                      <QrGenerator sesion={sesion} onRefresh={handleRefreshQR} />
                    </div>
                  </div>
                  <div className="card teacher-attendance-card">
                    <AttendanceTable
                      sesionId={sesion?.id}
                      asistencias={asistencias}
                      setAsistencias={setAsistencias}
                      estadosUI={ESTADOS_UI}
                    />
                  </div>
                </div>
              ))}

            {/* ─── ALUMNOS DEL CURSO ──────────────────── */}
            {activeTab === "alumnos" && (
              <div
                className="card tp-alumnos-card"
              >
                <div className="tp-alumnos-header">
                  <div className="card-title tp-alumnos-subtitle">
                    Alumnos de {cursoActivo.nombre}
                  </div>
                  <div className="card-subtitle tp-card-subtitle-mt">
                    {estudiantesCurso.length} matriculados. Añade o remueve alumnos de este curso.
                  </div>
                  <button
                    className="btn btn-primary tp-add-alumno-btn"
                    onClick={() => { setShowNuevoAlumno(true); setNuevoAlumnoCodigo(''); setNuevoAlumnoNombre(''); setNuevoAlumnoEncontrado(null); }}
                  >
                    <UserPlus size={16} /> Nuevo Alumno
                  </button>
                </div>

                {/* Modal Nuevo Alumno (Matricular) */}
                {showNuevoAlumno && (
                  <div className="tp-modal-overlay--blurred"
                    onClick={() => setShowNuevoAlumno(false)}>
                    <div className="tp-modal-box--xl"
                      onClick={e => e.stopPropagation()}>
                      <div className="tp-modal-header">
                        <h3 className="tp-modal-header__title">
                          <UserPlus size={18} className="tp-modal-header__icon" /> Matricular Alumno
                        </h3>
                      </div>
                      <form onSubmit={crearYAgregarAlumno}>
                        <div className="tp-modal-body">
                          <div className="form-group" style={{ marginTop: 0, position: 'relative' }}>
                            <label className="form-label tp-form-label-sm">CUI / Código</label>
                            <input
                              className="form-input"
                              autoFocus
                              value={nuevoAlumnoCodigo}
                              onChange={e => buscarAlumnoPorCodigo(e.target.value)}
                              placeholder="Código del alumno"
                              style={{ borderColor: nuevoAlumnoEncontrado ? (estudiantesCurso.some(est => est.id === nuevoAlumnoEncontrado.id) ? '#f59e0b' : '#22c55e') : undefined }}
                            />
                            {buscandoAlumno && <div className="tp-spinner-sm"><div className="spinner tp-spinner-xs" /></div>}
                            {nuevoAlumnoEncontrado && (
                              estudiantesCurso.some(est => est.id === nuevoAlumnoEncontrado.id) ? (
                                <div className="tp-alumno-warn">
                                  <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                                  <div>
                                    <div className="tp-alumno-warn__title">Ya está matriculado</div>
                                    <div className="tp-alumno-warn__sub">{nuevoAlumnoEncontrado.nombre_completo} ya pertenece a este curso.</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="tp-alumno-found">
                                  <Check size={14} style={{ color: '#16a34a' }} />
                                  <div>
                                    <div className="tp-alumno-found__title">Alumno encontrado</div>
                                    <div className="tp-alumno-found__sub">{nuevoAlumnoEncontrado.nombre_completo}</div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                          {!nuevoAlumnoEncontrado && nuevoAlumnoCodigo.trim().length >= 2 && !buscandoAlumno && (
                            <div className="form-group tp-form-group-0">
                              <label className="form-label tp-form-label-sm">Nombre Completo</label>
                              <input
                                className="form-input"
                                value={nuevoAlumnoNombre}
                                onChange={e => setNuevoAlumnoNombre(e.target.value)}
                                placeholder="Nombre Completo"
                                required={!nuevoAlumnoEncontrado}
                              />
                              <div className="tp-alumno-hint">
                                Se creará un nuevo usuario. La contraseña será igual al código.
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="tp-modal-footer--btn-row">
                          <button type="button" className="btn btn-ghost tp-flex-1" onClick={() => setShowNuevoAlumno(false)}>Cancelar</button>
                          <button
                            type="submit"
                            className="btn btn-primary tp-flex-1"
                            disabled={
                              !nuevoAlumnoCodigo.trim() ||
                              (!nuevoAlumnoEncontrado && !nuevoAlumnoNombre.trim()) ||
                              (nuevoAlumnoEncontrado && estudiantesCurso.some(est => est.id === nuevoAlumnoEncontrado.id))
                            }
                          >
                            {nuevoAlumnoEncontrado
                              ? (estudiantesCurso.some(est => est.id === nuevoAlumnoEncontrado.id) ? 'Ya Matriculado' : 'Añadir al Curso')
                              : 'Crear y Matricular'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Modal Editar Alumno */}
                {editingAlumnoData && (
                  <div className="tp-modal-overlay--blurred"
                    onClick={() => setEditingAlumnoData(null)}>
                    <div className="tp-modal-box--xl"
                      onClick={e => e.stopPropagation()}>
                      <div className="tp-modal-header">
                        <h3 className="tp-modal-header__title">
                          <Pencil size={18} className="tp-modal-header__icon" /> Editar Alumno
                        </h3>
                      </div>
                      <div className="tp-modal-body">
                        <div className="form-group tp-form-group-0">
                          <label className="form-label tp-form-label-sm">CUI / Código</label>
                          <input
                            className="form-input"
                            value={editingAlumnoData.codigo}
                            onChange={e => setEditingAlumnoData({ ...editingAlumnoData, codigo: e.target.value })}
                          />
                        </div>
                        <div className="form-group tp-form-group-0">
                          <label className="form-label tp-form-label-sm">Nombre Completo</label>
                          <input
                            className="form-input"
                            value={editingAlumnoData.nombre_completo}
                            onChange={e => setEditingAlumnoData({ ...editingAlumnoData, nombre_completo: e.target.value })}
                          />
                        </div>
                        <div className="form-group tp-form-group-0">
                          <label className="form-label tp-form-label-sm">Nueva Contraseña (dejar vacío para no cambiar)</label>
                          <input
                            className="form-input"
                            type="text"
                            value={editingAlumnoData.newPass || ''}
                            onChange={e => setEditingAlumnoData({ ...editingAlumnoData, newPass: e.target.value })}
                            placeholder="Escribir nueva contraseña"
                          />
                        </div>
                      </div>
                      <div className="tp-modal-footer--btn-row">
                        <button type="button" className="btn btn-ghost tp-flex-1" onClick={() => setEditingAlumnoData(null)}>Cancelar</button>
                        <button
                          type="button"
                          className="btn btn-primary tp-flex-1"
                          onClick={async () => {
                            try {
                              const payload = { codigo: editingAlumnoData.codigo, nombre_completo: editingAlumnoData.nombre_completo };
                              if (editingAlumnoData.newPass?.trim()) payload.pass = editingAlumnoData.newPass.trim();
                              await api.updateEstudiante(editingAlumnoData.id, payload);
                              setEstudiantesCurso(prev => prev.map(e => e.id === editingAlumnoData.id ? { ...e, codigo: editingAlumnoData.codigo, nombre_completo: editingAlumnoData.nombre_completo } : e));
                              toast.success('Alumno actualizado');
                              setEditingAlumnoData(null);
                            } catch (err) { toast.error(err.message); }
                          }}
                        >Guardar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabla de Alumnos */}
                <div className="tp-table-wrap">
                  <table className="tp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nombre</th>
                        <th>CUI</th>
                        <th className="th--center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesCurso.map((est, idx) => (
                        <tr key={est.id}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td className="tp-table__td--num">{idx + 1}</td>
                          <td className="tp-table__td--name">{est.nombre_completo}</td>
                          <td className="tp-table__td--code">{est.codigo}</td>
                          <td className="tp-table__td--center">
                            <div className="tp-table-cell-actions">
                              <button
                                className="btn btn-ghost tp-btn-edit"
                                onClick={() => setEditingAlumnoData({ ...est, newPass: '' })}
                                title="Editar alumno"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                className="btn btn-ghost tp-btn-delete"
                                onClick={() => { if (confirm(`¿Desmatricular a "${est.nombre_completo}" de este curso?`)) removeAlumno(est.id); }}
                                title="Desmatricular del curso"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {estudiantesCurso.length === 0 && (
                        <tr>
                          <td colSpan={4} className="tp-table-empty">No hay alumnos matriculados en este curso.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── CLASES PROGRAMADAS ─────────────────── */}
            {activeTab === "clases" && (
              <div className="card tp-clases-card">
                <div className="tp-clases-header">
                  <div>
                    <div className="card-title tp-clases-title">
                      <Calendar size={18} /> Cronograma
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddSesion(true)}
                  >
                    <Plus size={14} /> Programar
                  </button>
                </div>

                {/* ── Add Clase Modal ──────────────────── */}
                {showAddSesion && (
                  <div className="tp-modal-overlay--blurred" onClick={() => setShowAddSesion(false)}>
                    <div className="tp-modal-box--xl" onClick={(e) => e.stopPropagation()}>
                      <div className="tp-modal-header">
                        <h3 className="tp-modal-header__title">
                          <Plus size={18} className="tp-modal-header__icon" /> Programar
                        </h3>
                        <button onClick={() => setShowAddSesion(false)} className="tp-modal-close-btn">
                          <X size={20} />
                        </button>
                      </div>

                      <form onSubmit={programarClase} id="add-clase-form">
                        <div className="tp-modal-body">
                          <div className="form-group tp-form-group-0">
                            <label className="form-label tp-form-label-sm">Tipo de Sesión</label>
                            <div className="tp-tipo-selector">
                              {[{v:'clase',l:'Sesión de clase'},{v:'evento',l:'Evento'},{v:'puntos',l:'Puntos'}].map(({v,l}) => (
                                <button key={v} type="button"
                                  onClick={() => setNewClaseTipo(v)}
                                  className={`tp-tipo-btn ${newClaseTipo === v ? 'is-active' : ''}`}
                                >{l}</button>
                              ))}
                            </div>
                          </div>

                          <div className="tp-form-grid-2">
                            <div className="form-group tp-form-group-0">
                              <label className="form-label tp-form-label-sm">Nombre</label>
                              <input className="form-input" value={newClaseName} onChange={(e) => setNewClaseName(e.target.value)} placeholder="Ej: Sesión 1" required />
                            </div>
                            <div className="form-group tp-form-group-0">
                              <label className="form-label tp-form-label-sm">Fecha y Hora</label>
                              <input className="form-input" type="datetime-local" value={newClaseDate} onChange={(e) => setNewClaseDate(e.target.value)} required />
                            </div>
                          </div>

                          <label className="tp-visible-label">
                            <input type="checkbox" checked={newClaseVisible} onChange={e => setNewClaseVisible(e.target.checked)} />
                            Visible para alumnos en su historial
                          </label>

                          {newClaseTipo === 'clase' && (
                            <div className="tp-limits-section">
                              <label className="tp-limits-label">
                                <input type="checkbox" checked={showLimits} onChange={(e) => setShowLimits(e.target.checked)} />
                                Horario límite personalizado
                              </label>

                              <div className={`tp-form-grid-3 ${!showLimits ? 'is-disabled' : ''}`}>
                                <div className="form-group tp-form-group-0">
                                  <label className="form-label tp-time-label--puntual">Puntual</label>
                                  <input type="time" className="form-input tp-time-input" value={limPuntual} onChange={(e) => setLimPuntual(e.target.value)} />
                                </div>
                                <div className="form-group tp-form-group-0">
                                  <label className="form-label tp-time-label--presente">Presente</label>
                                  <input type="time" className="form-input tp-time-input" value={limPresente} onChange={(e) => setLimPresente(e.target.value)} />
                                </div>
                                <div className="form-group tp-form-group-0">
                                  <label className="form-label tp-time-label--tarde">Tarde</label>
                                  <input type="time" className="form-input tp-time-input" value={limTarde} onChange={(e) => setLimTarde(e.target.value)} />
                                </div>
                              </div>
                            </div>
                          )}
                          {newClaseTipo === 'evento' && <div className="tp-info-box--evento"><strong>Evento:</strong> Se activará automáticamente. Los estudiantes que escaneen el QR serán registrados como "Participó".</div>}
                          {newClaseTipo === 'puntos' && <div className="tp-info-box--puntos"><strong>Puntos:</strong> Se agregarán automáticamente a todos los estudiantes en el historial.</div>}
                        </div>
                      </form>

                      <div className="tp-modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={() => setShowAddSesion(false)}>Cancelar</button>
                        <button type="submit" form="add-clase-form" className="btn btn-primary" disabled={!newClaseName.trim() || !newClaseDate}>Programar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Edit Clase Modal ──────────────────────── */}
                {editingSesion && (
                  <div className="tp-modal-overlay--blurred" onClick={() => setEditingSesion(null)}>
                    <div className="tp-modal-box--xl" onClick={(e) => e.stopPropagation()}>
                      <div className="tp-modal-header">
                        <h3 className="tp-modal-header__title">
                          <Edit size={18} className="tp-modal-header__icon" /> Modificar
                        </h3>
                        <button onClick={() => setEditingSesion(null)} className="tp-modal-close-btn">
                          <X size={20} />
                        </button>
                      </div>

                      <form onSubmit={saveEditedSesion} id="edit-clase-form">
                        <div className="tp-modal-body">
                          <div className="tp-form-grid-2">
                            <div className="form-group tp-form-group-0">
                              <label className="form-label tp-form-label-sm">Nombre</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editSesionData.nombre_clase}
                                onChange={(e) =>
                                  setEditSesionData({
                                    ...editSesionData,
                                    nombre_clase: e.target.value,
                                  })
                                }
                                className="form-input tp-input--sm"
                                required
                              />
                            </div>
                            <div className="form-group tp-form-group-0">
                              <label className="form-label tp-form-label-sm">Fecha y Hora</label>
                              <input
                                type="datetime-local"
                                className="form-input"
                                value={editSesionData.fecha_programada}
                                onChange={(e) =>
                                  setEditSesionData({
                                    ...editSesionData,
                                    fecha_programada: e.target.value,
                                  })
                                }
                                className="form-input tp-input--sm"
                                required
                              />
                            </div>
                          </div>

{editSesionData.tipo === 'clase' && (
                          <div className="tp-limits-section tp-limits-section--mt">
                            <label className="tp-form-label-sm--group">
                              Límites de Tiempo Personalizados
                            </label>
                            <div className="tp-form-grid-3">
                              <div className="form-group tp-form-group-0">
                                <label className="form-label tp-time-label--puntual">
                                  Puntual
                                </label>
                                <input
                                  type="time"
                                  className="form-input tp-time-input--sm"
                                  value={editSesionData.limite_puntual}
                                  onChange={(e) =>
                                    setEditSesionData({
                                      ...editSesionData,
                                      limite_puntual: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="form-group tp-form-group-0">
                                <label className="form-label tp-time-label--presente">
                                  Presente
                                </label>
                                <input
                                  type="time"
                                  className="form-input tp-time-input--sm"
                                  value={editSesionData.limite_presente}
                                  onChange={(e) =>
                                    setEditSesionData({
                                      ...editSesionData,
                                      limite_presente: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="form-group tp-form-group-0">
                                <label className="form-label tp-time-label--tarde">
                                  Tarde
                                </label>
                                <input
                                  type="time"
                                  className="form-input tp-time-input--sm"
                                  value={editSesionData.limite_tarde}
                                  onChange={(e) =>
                                    setEditSesionData({
                                      ...editSesionData,
                                      limite_tarde: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
)}

                          <label className="tp-visible-label--card">
                            <input
                              type="checkbox"
                              checked={editSesionData.visible_alumnos}
                              onChange={(e) =>
                                setEditSesionData({
                                  ...editSesionData,
                                  visible_alumnos: e.target.checked,
                                })
                              }
                            />
                            Visible para alumnos en su historial
                          </label>
                        </div>
                      </form>

                      {/* Footer */}
                      <div className="tp-modal-footer">
                        <button
                          className="btn btn-ghost tp-btn-height"
                          onClick={() => setEditingSesion(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          form="edit-clase-form"
                          className="btn btn-primary tp-btn-height"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Session list */}
                {sesionesProgr.length === 0 ? (
                  <p className="text-muted">No hay actividades programadas aún.</p>
                ) : (
                  <div className="tp-sesiones-list">
                    {sesionesProgr.map((s) => (
                      <div key={s.id}>
                        <div
                          className="tp-session-item"
                          style={{
                            background: s.activa
                              ? "var(--success-bg)"
                              : s.tipo === 'evento'
                                ? 'rgba(34, 197, 94, 0.08)'
                                : s.tipo === 'puntos'
                                  ? 'rgba(245, 158, 11, 0.08)'
                                  : 'rgba(59, 130, 246, 0.06)',
                            border: `1px solid ${s.activa ? "var(--success)" : s.tipo === 'evento' ? 'rgba(34, 197, 94, 0.2)' : s.tipo === 'puntos' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                          }}
                        >
                          <div className="tp-session-row">
                            <strong className="tp-session-row__name">
                              {s.nombre_clase}
                            </strong>
                            <span className="tp-session-row__meta">
                              {s.fecha_programada
                                ? fmtFecha(s.fecha_programada)
                                : fmtFecha(s.fecha_inicio)}
                              {s.total_asistencias > 0 &&
                                ` • ${s.total_asistencias} asistencias`}
                              <span
                                className={`tp-tipo-pill tp-tipo-pill--${s.tipo || 'clase'}`}
                              >{s.tipo || 'clase'}</span>
                            </span>
                          </div>
                          <div className="tp-session-row__actions">
                            {s.activa ? (
                              <span className="badge tp-badge-live">
                                En vivo
                              </span>
                            ) : s.faltas_procesadas ? (
                              <span className="badge tp-badge-done">
                                Finalizada
                              </span>
                            ) : s.tipo === 'puntos' ? (
                              <span className="badge tp-badge-manual">
                                Listo
                              </span>
                            ) : (
                              <button
                                className="btn btn-sm btn-primary tp-btn-start"
                                onClick={() => activarSesion(s.id, s.tipo)}
                              >
                                <Play size={12} fill="currentColor" /> Iniciar
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-ghost tp-btn-edit-sm"
                              onClick={() => openEditForm(s)}
                              title="Editar clase"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-ghost tp-btn-delete-sm"
                              onClick={() => eliminarSesionProgramada(s.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── HISTORIAL / MATRIZ ─────────────────── */}
            {activeTab === "historial" && (
              <div
                className="card tp-historial-card"
              >
                <div className="tp-historial-header">
                  <div>
                    <div className="card-title">Asistencias</div>
                  </div>
                  <div className="tp-historial-actions">
                    <div className="tp-historial-search-wrap">
                      <Search
                        size={16}
                        className="tp-historial-search-icon"
                      />
                      <input
                        type="text"
                        placeholder="Buscar alumno o código..."
                        className="form-input tp-historial-search-input"
                        value={searchHistorial}
                        onChange={(e) => setSearchHistorial(e.target.value)}
                      />
                      {searchHistorial && (
                        <button
                          onClick={() => setSearchHistorial("")}
                          className="tp-historial-clear-btn"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {historialGen.length > 0 && (
                      <button
                        onClick={exportToExcel}
                        className="btn tp-excel-btn"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f0fdf4")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "white")
                        }
                      >
                        <img
                          src={ExcelIcon}
                          alt="Excel"
                          width="16"
                          height="16"
                        />
                        Exportar Excel
                      </button>
                    )}
                  </div>
                </div>

                {historialGen.length === 0 ? (
                  <p className="text-muted" style={{ marginTop: "1rem" }}>
                    No hay clases o registros aún para este curso.
                  </p>
                ) : (
                  <div
                    className="table-modelo-wrapper tp-historial-table-wrap"
                  >
                    <table className="table-modelo tp-historial-table">
                      <thead>
                        <tr>
                          <th
                            className="sticky-col"
                          >
                            Estudiante
                          </th>
                          {clasesColumns.map((c) => {
                            let typeStyles = { bg: '#eff6ff', border: '#bfdbfe', textPrimary: '#1e40af', textSecondary: '#60a5fa' }; // clase by default
                            if (c.tipo === 'puntos') typeStyles = { bg: '#fffbeb', border: '#fde68a', textPrimary: '#92400e', textSecondary: '#d97706' };
                            if (c.tipo === 'evento') typeStyles = { bg: '#f0fdf4', border: '#bbf7d0', textPrimary: '#166534', textSecondary: '#4ade80' };

                            return (
                              <th
                                key={c.id}
                                className="tp-matrix-th"
                                style={{ minWidth: c.tipo === 'puntos' ? '80px' : '70px' }}
                              >
                                <div className="tp-matrix-col-header">
                                  <div className="tp-matrix-col-label">
                                    {c.tipo === 'clase' ? c.label : c.name}
                                  </div>
                                  {c.tipo === 'clase' ? (
                                    <div className="tp-matrix-col-sub">
                                      <div className="tp-tipo-tag" style={{ background: typeStyles.bg, color: typeStyles.textPrimary }}>
                                        {c.tipo}
                                      </div>
                                      <span>{c.name}</span>
                                    </div>
                                  ) : (
                                    <div className="tp-tipo-tag" style={{ background: typeStyles.bg, color: typeStyles.textPrimary }}>
                                      {c.tipo}
                                    </div>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                          <th
                            className="sticky-col-right tp-matrix-th--score"
                          >
                            Punt.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {estudiantesCurso
                          .filter(
                            (est) =>
                              est.nombre_completo
                                .toLowerCase()
                                .includes(searchHistorial.toLowerCase()) ||
                              est.codigo
                                .toLowerCase()
                                .includes(searchHistorial.toLowerCase()),
                          )
                          .map((est, i) => {
                            const recs = historialGen.filter(
                              (h) => h.estudiante_id === est.id,
                            );
                            const points = recs.reduce((acc, h) => {
                              // Usar puntuacion (valor guardado en BD) en lugar de valor
                              return acc + (parseFloat(h.puntuacion) || 0);
                            }, 0);

                            return (
                              <tr
                                key={est.id}
                                className={i % 2 === 0 ? 'tp-tr-even' : 'tp-tr-odd'}
                              >
                                <td className="sticky-col">
                                  <div className="tp-student-cell">
                                    <span className="tp-student-cell__name">
                                      {est.nombre_completo}
                                    </span>
                                    <span className="tp-student-cell__code">
                                      {est.codigo}
                                    </span>
                                  </div>
                                </td>
                                {clasesColumns.map((c) => {
                                  const r = recs.find((h) => h.sesion_id === c.id);

                                  // ── Puntos: mostrar contador +1/-1 ──
                                  if (c.tipo === 'puntos') {
                                    // r.valor es el campo INTEGER de asistencias para sesiones tipo 'puntos'
                                    const valor = r ? (r.valor ?? 0) : 0;
                                    return (
                                      <td key={c.id} style={{ borderLeft: '1px solid var(--gray-100)', verticalAlign: 'middle', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {true ? (
                                              <>
                                                <button
                                                  onClick={async () => {
                                                    try {
                                                      if (!r?.id) {
                                                        const res = await api.crearAsistenciaManual({ estudiante_id: est.id, sesion_id: c.id, valor: -1 });
                                                        const [resH2] = await Promise.all([api.getCursoHistorial(cursoActivo.id)]);
                                                        setHistorialGen(resH2.historial); return;
                                                      }
                                                      const res2 = await api.ajustarPunto(r.id, -1);
                                                      setHistorialGen(prev => prev.map(h => h.id === r.id ? { ...h, valor: res2.asistencia.valor } : h));
                                                    } catch(err) { toast.error(err.message); }
                                                  }}
                                                  className="btn-puntos btn-puntos-minus"
                                                  style={{ border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                                >-</button>
                                                <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: 24, textAlign: 'center', color: valor > 0 ? '#16a34a' : valor < 0 ? '#dc2626' : 'var(--gray-500)' }}>{valor}</span>
                                                <button
                                                  onClick={async () => {
                                                    try {
                                                      if (!r?.id) {
                                                        const res = await api.crearAsistenciaManual({ estudiante_id: est.id, sesion_id: c.id, valor: 1 });
                                                        const [resH2] = await Promise.all([api.getCursoHistorial(cursoActivo.id)]);
                                                        setHistorialGen(resH2.historial); return;
                                                      }
                                                      const res2 = await api.ajustarPunto(r.id, 1);
                                                      setHistorialGen(prev => prev.map(h => h.id === r.id ? { ...h, valor: res2.asistencia.valor } : h));
                                                    } catch(err) { toast.error(err.message); }
                                                  }}
                                                  className="btn-puntos btn-puntos-plus"
                                                  style={{ border: 'none', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                                >+</button>
                                              </>
                                            ) : (
                                              <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: 24, textAlign: 'center', color: valor > 0 ? '#16a34a' : valor < 0 ? '#dc2626' : 'var(--gray-500)' }}>{valor}</span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  // ── Clase / Evento: selector de estado normal (o texto si no es admin) ──
                                  const status = r ? r.estado : '';
                                  const ui = status ? ESTADOS_UI[status] : null;
                                  const bgColor = ui ? ui.bg : 'transparent';
                                  const borderColor = ui ? ui.border : 'transparent';
                                  const textColor = ui ? ui.color : 'inherit';

                                  return (
                                    <td key={c.id} style={{ borderLeft: '1px solid var(--gray-100)', background: 'transparent', verticalAlign: 'middle', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '38px' }}>
                                        <div style={{ background: bgColor, border: ui ? `1px solid ${borderColor}` : 'none', borderRadius: '20px', padding: status ? '0px 10px' : '0px', display: 'flex', justifyContent: 'center', minWidth: '95px', color: textColor }}>
                                          {true ? (
                                            <select
                                              value={status}
                                              onChange={(e) => {
                                                if (!e.target.value) return;
                                                if (r) updateAsistenciaEstado(r.id, e.target.value);
                                                else createAsistenciaManual(est.id, c.id, e.target.value);
                                              }}
                                              className={`badge-status ${status.toLowerCase()}`}
                                              style={{ width: '100%', minHeight: '20px', appearance: 'none', border: 'none', background: 'transparent', textAlign: 'center', cursor: 'pointer', outline: 'none', fontWeight: '800', fontSize: '0.7rem', color: 'inherit' }}
                                            >
                                              <option value="" disabled style={{ color: '#000' }}>—</option>
                                              {estadosDB.map(e => (
                                                <option key={e.id} value={e.nombre} style={{ background: e.color, color: 'white' }}>{e.nombre}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <span style={{ fontWeight: '800', fontSize: '0.7rem', padding: '1px 0', textAlign: 'center', color: ui ? textColor : 'var(--gray-400)' }}>
                                              {status || '—'}
                                            </span>
                                          )}
                                        </div>
                                        {r && r.fecha_hora && (
                                          <div className="historial-time">
                                            {new Date(r.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td
                                  className="sticky-col-right tp-score-cell"
                                >
                                  {Math.round(points)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    <div className="tp-legend">
                      {Object.keys(ESTADOS_UI).map((k) => (
                        <div
                          key={k}
                          className="tp-legend__item"
                        >
                          <span
                            className="tp-legend__dot"
                            style={{
                              background: ESTADOS_UI[k].bg,
                              border: `1px solid ${ESTADOS_UI[k].border}`
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 500,
                              color: ESTADOS_UI[k].color,
                            }}
                          >
                            {k}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── CONFIGURACIÓN ──────────────────────── */}
            {activeTab === "config" && (
              <>
                {/* ── Estados de Asistencia CRUD ──────────── */}
                <div className="card tp-config-card">
                  <div className="tp-config-header">
                    <div className="card-title tp-alumnos-subtitle">Estados de Asistencia</div>
                    <div className="card-subtitle tp-card-subtitle-mt">
                      Administra los tipos de asistencia, sus colores y puntuación.
                    </div>
                    <button
                      className="btn btn-primary tp-config-add-btn"
                      onClick={handleNewEstado}
                    >
                      <Plus size={16} /> Nuevo
                    </button>
                  </div>
                  
                  <div className="tp-table-wrap">
                    <table className="tp-config-table">
                      <thead>
                        <tr>
                          <th className="tp-config-table__th">Color</th>
                          <th className="tp-config-table__th">Nombre del Estado</th>
                          <th className="tp-config-table__th tp-config-table__th--center">Puntos</th>
                          <th className="tp-config-table__th tp-config-table__th--center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadosDB.map((est) => (
                          <tr key={est.id} className="tp-config-table__tr">
                            <td className="tp-config-table__td">
                              <div
                                className="tp-estado-dot"
                                style={{
                                  background: `color-mix(in srgb, ${est.color} 15%, transparent)`,
                                  border: `1px solid ${est.color}`
                                }}
                              />
                            </td>
                            <td className="tp-config-table__td tp-config-table__td--name">{est.nombre}</td>
                            <td className="tp-config-table__td tp-config-table__td--center">
                              <span className="tp-estado-puntos-badge">
                                {est.puntuacion}
                              </span>
                            </td>
                            <td className="tp-config-table__td tp-config-table__td--center">
                              <div className="tp-table-actions">
                                <button
                                  className="btn btn-ghost tp-btn-edit"
                                  onClick={() => handleEditEstado(est)}
                                  title="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="btn btn-ghost tp-btn-delete"
                                  onClick={async () => {
                                    if (!confirm(`¿Eliminar el estado "${est.nombre}"?`)) return;
                                    try {
                                      await api.deleteEstado(est.id);
                                      setEstadosDB((prev) => prev.filter((s) => s.id !== est.id));
                                      toast.info(`"${est.nombre}" eliminado`);
                                    } catch (err) {
                                      toast.error(err.message);
                                    }
                                  }}
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {estadosDB.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "var(--gray-400)", fontStyle: "italic" }}>
                              No hay estados de asistencia configurados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Modal para Crear / Editar Estado */}
            {showEstadoModal && (
                <div
                  className="tp-modal-overlay--high"
                  onClick={() => setShowEstadoModal(false)}
                >
                <div
                  className="tp-modal-box--md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="tp-modal-header--simple">
                    <h3 className="tp-modal-title-row">
                      {editEstado ? <Edit size={18} className="tp-modal-icon-primary" /> : <Plus size={18} className="tp-modal-icon-primary" />}
                      {editEstado ? "Editar Estado" : "Nuevo Estado"}
                    </h3>
                  </div>
                  <form onSubmit={saveEstado}>
                    <div className="tp-modal-body-pad">
                      <div className="form-group tp-form-group-0">
                        <label className="form-label tp-modal-label">Nombre del Estado</label>
                        <input
                          className="form-input"
                          value={estadoData.nombre}
                          onChange={(e) => setEstadoData({ ...estadoData, nombre: e.target.value })}
                          required
                        />
                      </div>
                      <div className="tp-color-row">
                        <div className="form-group tp-flex-1">
                          <label className="form-label tp-modal-label">Color de Etiqueta</label>
                          <div className="tp-color-input-wrap">
                            <input
                              type="color"
                              value={estadoData.color}
                              onChange={(e) => setEstadoData({ ...estadoData, color: e.target.value })}
                              className="tp-color-picker"
                            />
                            <span className="tp-color-hex">{estadoData.color.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="form-group tp-form-group--score">
                          <label className="form-label tp-modal-label">Puntos</label>
                          <input
                            className="form-input tp-input-score"
                            type="number"
                            step="0.01"
                            min="-9.99"
                            max="9.99"
                            value={estadoData.puntuacion}
                            onChange={(e) => setEstadoData({ ...estadoData, puntuacion: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="tp-modal-footer--start" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowEstadoModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <Footer simple={true} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// UsersView — Gestión de usuarios
// ══════════════════════════════════════════════════════════════
function UsersView({ onBack, cursos, onCursosUpdated, onProfesoresUpdated }) {
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState("");
  const [rolFilter, setRolFilter] = useState("3"); // Estudiantes por defecto
  const [editUser, setEditUser] = useState(null);
  const [editData, setEditData] = useState({ codigo: "", nombre_completo: "", rol: 3, pass: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ codigo: "", nombre_completo: "", rol: 3, pass: "" });
  const [loadingU, setLoadingU] = useState(true);

  useEffect(() => {
    api
      .getUsuarios()
      .then((res) => setUsuarios(res.usuarios))
      .catch(() => toast.error("Error cargando usuarios"))
      .finally(() => setLoadingU(false));
  }, []);

  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch =
      u.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      u.codigo.toLowerCase().includes(search.toLowerCase());
    const matchesRol =
      rolFilter === "all" || Number(u.rol) === Number(rolFilter);
    return matchesSearch && matchesRol;
  });

  const openEdit = (u) => {
    setEditUser(u);
    setEditData({ codigo: u.codigo, nombre_completo: u.nombre_completo, rol: u.rol || 3, pass: "" });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.updateEstudiante(editUser.id, editData);
      
      const resU = await api.getUsuarios();
      setUsuarios(resU.usuarios);
      setEditUser(null);
      toast.success("Usuario actualizado");
      
      if (onProfesoresUpdated) {
        onProfesoresUpdated();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteUser = async (u) => {
    if (
      !confirm(
        `¿Eliminar a "${u.nombre_completo}"? Se borrarán sus asistencias.`,
      )
    )
      return;
    try {
      await api.deleteUsuario(u.id);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      toast.info("Usuario eliminado");
      
      if (Number(u.rol) === 2 && onProfesoresUpdated) {
        onProfesoresUpdated();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUser.codigo.trim() || !newUser.nombre_completo.trim()) return;
    try {
      const { usuario } = await api.crearUsuario({
        codigo: newUser.codigo.trim().toUpperCase(),
        nombre_completo: newUser.nombre_completo.trim(),
        rol: Number(newUser.rol),
        pass: newUser.pass.trim()
      });
      setUsuarios((prev) =>
        [...prev, usuario].sort((a, b) =>
          a.nombre_completo.localeCompare(b.nombre_completo),
        ),
      );
      setNewUser({ codigo: "", nombre_completo: "", rol: 3, pass: "" });
      setShowAdd(false);
      toast.success("Usuario creado");
      
      if (Number(usuario.rol) === 2 && onProfesoresUpdated) {
        onProfesoresUpdated();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleCurso = async (userId, cursoId, isEnrolled) => {
    try {
      if (isEnrolled) {
        await api.removeEstudianteCurso(cursoId, userId);
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, cursos: u.cursos.filter((c) => c.id !== cursoId) }
              : u,
          ),
        );
        if (editUser?.id === userId) {
          setEditUser((prev) => ({
            ...prev,
            cursos: prev.cursos.filter((c) => c.id !== cursoId),
          }));
        }
      } else {
        await api.addEstudianteCurso(cursoId, userId);
        const curso = cursos.find((c) => c.id === cursoId);
        const nc = { id: cursoId, nombre: curso?.nombre };
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, cursos: [...u.cursos, nc] } : u,
          ),
        );
        if (editUser?.id === userId) {
          setEditUser((prev) => ({ ...prev, cursos: [...prev.cursos, nc] }));
        }
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .responsive-filters {
            flex-direction: column;
            align-items: stretch !important;
            width: 100%;
          }
          .responsive-filters > div, 
          .responsive-filters > button {
            width: 100% !important;
            max-width: 100% !important;
            flex: unset !important;
          }
          .btn-add-user {
            justify-content: center;
          }
        }
        .responsive-filters-control::-webkit-scrollbar {
          display: none;
        }
        .responsive-filters-control {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      {/* ── Edit Modal ──────────────────────── */}
      {editUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setEditUser(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--gray-100)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--gray-50)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  color: "var(--gray-800)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Edit size={18} style={{ color: "var(--primary)" }} />
                Editar Usuario
              </h3>
              <button
                onClick={() => setEditUser(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--gray-400)",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div className="form-group">
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--gray-500)",
                    marginBottom: "4px",
                  }}
                >
                  CUI / Código
                </label>
                <input
                  className="form-input"
                  value={editData.codigo}
                  onChange={(e) =>
                    setEditData({ ...editData, codigo: e.target.value })
                  }
                  style={{ fontSize: "0.9rem" }}
                />
              </div>
              <div className="form-group">
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--gray-500)",
                    marginBottom: "4px",
                  }}
                >
                  Nombre Completo
                </label>
                <input
                  className="form-input"
                  value={editData.nombre_completo}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      nombre_completo: e.target.value,
                    })
                  }
                  style={{ fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "4px" }}>Rol</label>
                  <select
                    className="form-input"
                    value={editData.rol}
                    onChange={(e) => setEditData({ ...editData, rol: Number(e.target.value) })}
                    style={{ fontSize: "0.9rem" }}
                  >
                    <option value={1}>Administrador</option>
                    <option value={2}>Profesor</option>
                    <option value={3}>Estudiante</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "4px" }}>Nueva Contraseña</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Dejar en blanco para no cambiar"
                    value={editData.pass}
                    onChange={(e) => setEditData({ ...editData, pass: e.target.value })}
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              {/* Cursos del Profesor o Cursos Matriculados del Estudiante */}
              <div>
                {Number(editData.rol) === 2 ? (
                  <>
                    <label
                      className="form-label"
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--gray-500)",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Propiedad de Cursos (Rol Docente)
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: "8px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        padding: "2px",
                        paddingRight: "6px"
                      }}
                    >
                      {cursos.map((c) => {
                        const isEnrolled = (editUser.cursos_dictados || []).some((curso) => curso.id === c.id);
                        
                        return (
                          <div
                            key={c.id}
                            onClick={async () => {
                              try {
                                if (isEnrolled) {
                                  await api.removeEstudianteCurso(c.id, editUser.id);
                                  toast.success(`Docente removido de ${c.nombre}`);
                                } else {
                                  await api.addEstudianteCurso(c.id, editUser.id);
                                  toast.success(`Docente asignado a ${c.nombre}`);
                                }
                                
                                // Refresh users list
                                const resU = await api.getUsuarios();
                                setUsuarios(resU.usuarios);
                                
                                // Sync editUser state
                                const updatedUser = resU.usuarios.find(x => x.id === editUser.id);
                                if (updatedUser) {
                                  setEditUser(updatedUser);
                                }
                                
                                // Refresh parent courses list
                                if (onCursosUpdated) onCursosUpdated();
                              } catch (err) {
                                toast.error(err.message);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: isEnrolled
                                ? "1.5px solid #22c55e"
                                : "1px solid var(--gray-200)",
                              background: isEnrolled ? "#f0fdf4" : "white",
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--gray-800)" }}>
                                {c.nombre}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>
                                {isEnrolled ? "Asignado" : "No asignado"}
                              </span>
                            </div>
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px", // cuadrado en vez de redondo para checkboxes
                                border: isEnrolled ? "2px solid #22c55e" : "2px solid var(--gray-300)",
                                background: isEnrolled ? "#22c55e" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isEnrolled && <Check size={12} color="white" />}
                            </div>
                          </div>
                        );
                      })}
                      {cursos.length === 0 && (
                        <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", fontStyle: "italic" }}>
                          No hay cursos creados.
                        </div>
                      )}
                    </div>
                  </>
                ) : Number(editData.rol) === 3 ? (
                  <>
                    <label
                      className="form-label"
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--gray-500)",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Cursos Matriculados
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {cursos.map((c) => {
                        const enrolled = (editUser.cursos || []).some(
                          (uc) => uc.id === c.id,
                        );
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleCurso(editUser.id, c.id, enrolled)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: enrolled
                                ? "1.5px solid var(--primary)"
                                : "1px solid var(--gray-200)",
                              background: enrolled ? "var(--primary-bg)" : "white",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                flexShrink: 0,
                                border: enrolled
                                  ? "2px solid var(--primary)"
                                  : "2px solid var(--gray-300)",
                                background: enrolled ? "var(--primary)" : "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {enrolled && <Check size={14} color="white" />}
                            </div>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: enrolled ? "600" : "400",
                                color: enrolled
                                  ? "var(--primary-dark)"
                                  : "var(--gray-600)",
                              }}
                            >
                              {c.nombre}
                            </span>
                          </div>
                        );
                      })}
                      {cursos.length === 0 && (
                        <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", fontStyle: "italic" }}>
                          No hay cursos creados.
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--gray-100)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                background: "var(--gray-50)",
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setEditUser(null)}
                style={{ height: "36px" }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={saveEdit}
                style={{ height: "36px" }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={onBack}
            style={{
              padding: "6px 10px",
              background: "white",
              border: "1px solid var(--gray-200)",
            }}
          >
            « Volver
          </button>
          <h2
            style={{ fontSize: "1.2rem", margin: 0, color: "var(--gray-800)" }}
          >
            <Users
              size={20}
              style={{ verticalAlign: "middle", marginRight: "6px" }}
            />
            Usuarios
          </h2>
        </div>
        <div 
          className="responsive-filters" 
          style={{ 
            display: "flex", 
            gap: "0.75rem", 
            flexWrap: "wrap", 
            alignItems: "center",
            flex: "1",
            justifyContent: "flex-end"
          }}
        >
          {/* Segmented Control for Roles */}
          <div
            className="responsive-filters-control"
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
              gap: "2px",
              border: "1px solid #e2e8f0",
              overflowX: "auto",
              maxWidth: "100%",
              whiteSpace: "nowrap",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {[
              { label: "Estudiantes", value: "3" },
              { label: "Profesores", value: "2" },
              { label: "Administradores", value: "1" },
              { label: "Todos", value: "all" },
            ].map((btn) => {
              const active = rolFilter === btn.value;
              return (
                <button
                  key={btn.value}
                  onClick={() => setRolFilter(btn.value)}
                  style={{
                    border: "none",
                    background: active ? "white" : "transparent",
                    color: active ? "#1e293b" : "#64748b",
                    fontWeight: active ? "600" : "500",
                    fontSize: "0.82rem",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div 
            className="search-container-historial"
            style={{ 
              position: "relative",
              flex: "1 1 200px",
              maxWidth: "100%"
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--gray-400)",
                zIndex: 1,
              }}
            />
            <input
              className="form-input"
              placeholder="Buscar por nombre o CUI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "38px",
                paddingRight: "34px",
                height: "42px",
                fontSize: "0.85rem",
                borderRadius: "10px",
                border: "1px solid var(--gray-200)",
                background: "var(--white)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--gray-400)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="btn btn-primary btn-add-user"
            onClick={() => setShowAdd(!showAdd)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              height: "42px",
              width: "auto",
              padding: "0 20px",
              borderRadius: "10px",
              fontWeight: "700",
              boxShadow: "0 4px 12px rgba(0, 65, 130, 0.2)",
            }}
          >
            <UserPlus size={18} /> Añadir
          </button>
        </div>
      </div>

      {/* ── Add User Modal ────────────────────────── */}
      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--gray-100)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--gray-50)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  color: "var(--gray-800)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <UserPlus size={18} style={{ color: "var(--primary)" }} />
                Nuevo Usuario
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--gray-400)",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={addUser}>
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    CUI / Código
                  </label>
                  <input
                    className="form-input"
                    placeholder="CUI / Código"
                    value={newUser.codigo}
                    onChange={(e) =>
                      setNewUser({ ...newUser, codigo: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    Nombre Completo
                  </label>
                  <input
                    className="form-input"
                    placeholder="Nombre Completo"
                    value={newUser.nombre_completo}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        nombre_completo: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "4px" }}>Rol</label>
                    <select
                      className="form-input"
                      value={newUser.rol}
                      onChange={(e) => setNewUser({ ...newUser, rol: Number(e.target.value) })}
                      style={{ fontSize: "0.9rem" }}
                    >
                      <option value={1}>Administrador</option>
                      <option value={2}>Profesor</option>
                      <option value={3}>Estudiante</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: "4px" }}>Contraseña (Opcional)</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Por defecto: El Código"
                      value={newUser.pass}
                      onChange={(e) => setNewUser({ ...newUser, pass: e.target.value })}
                      style={{ fontSize: "0.9rem" }}
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid var(--gray-100)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  background: "var(--gray-50)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAdd(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users list */}
      {loadingU ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div
            className="spinner"
            style={{
              borderTopColor: "var(--primary)",
              width: 32,
              height: 32,
              margin: "0 auto",
            }}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)', textAlign: 'left', background: 'var(--gray-50)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '40px' }}>#</th>
                  <th style={{ padding: '12px 16px', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CUI / Código</th>
                  <th style={{ padding: '12px 16px', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {rolFilter === "2" ? "Cursos Propios" : rolFilter === "1" ? "Cursos" : "Cursos Matriculados"}
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: '100px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--gray-400)', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                        {u.nombre_completo}
                        {Number(u.rol) === 1 && (
                          <span style={{ marginLeft: "6px", background: "var(--primary)", color: "white", borderRadius: "4px", padding: "1px 6px", fontSize: "0.65rem", fontWeight: "600" }}>
                            ADMIN
                          </span>
                        )}
                        {Number(u.rol) === 2 && (
                          <span style={{ marginLeft: "6px", background: "var(--gray-200)", color: "var(--gray-700)", borderRadius: "4px", padding: "1px 6px", fontSize: "0.65rem", fontWeight: "600" }}>
                            PROFESOR
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--gray-500)', fontFamily: 'monospace', fontWeight: 500 }}>
                      {u.codigo}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {Number(u.rol) === 2 ? (
                          <>
                            {(u.cursos_dictados || []).map((c) => (
                              <span
                                key={c.id}
                                style={{
                                  display: "inline-block",
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  border: "1px solid #bae6fd",
                                  borderRadius: "12px",
                                  padding: "2px 8px",
                                  fontSize: "0.68rem",
                                  fontWeight: "600",
                                }}
                              >
                                {c.nombre}
                              </span>
                            ))}
                            {(!u.cursos_dictados || u.cursos_dictados.length === 0) && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  color: "var(--gray-400)",
                                  fontStyle: "italic",
                                }}
                              >
                                Sin cursos asignados
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {(u.cursos || []).map((c) => (
                              <span
                                key={c.id}
                                style={{
                                  display: "inline-block",
                                  background: "var(--primary-bg)",
                                  color: "var(--primary-dark)",
                                  border: "1px solid var(--primary-light, #c7d2fe)",
                                  borderRadius: "12px",
                                  padding: "2px 8px",
                                  fontSize: "0.68rem",
                                  fontWeight: "600",
                                }}
                              >
                                {c.nombre}
                              </span>
                            ))}
                            {(!u.cursos || u.cursos.length === 0) && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  color: "var(--gray-400)",
                                  fontStyle: "italic",
                                }}
                              >
                                Sin curso
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => openEdit(u)}
                          style={{ padding: "6px", color: "var(--primary)", border: "1px solid var(--primary-bg)", background: "var(--primary-bg)" }}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => deleteUser(u)}
                          style={{ padding: "6px", color: "var(--error)", border: "1px solid #fee2e2", background: "#fef2f2" }}
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "var(--gray-400)",
                }}
              >
                No se encontraron usuarios.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
