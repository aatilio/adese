// VITE_API_URL:
// - Local Docker: http://localhost:3000
// - Vercel / Mismo Dominio: '' (vacío, usa rewrites relativos de vercel.json -> /api/*)
// - Servidor Externo / Producción (Render, Railway, VPS): https://api.midominio.com
const API = import.meta.env.VITE_API_URL || '';

const request = async (method, path, body) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);

  // Fast path: parse JSON directly; only fall back to text on parse error
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${method} ${path})`);
  }

  if (!res.ok) throw new Error(data?.error || 'Error desconocido');
  return data;
};

export const api = {
  // Auth
  login:               (codigo, pass) => request('POST', '/api/auth/login', { codigo, pass: pass || '' }),
  registerDocente:     (datos)        => request('POST', '/api/auth/register', datos),

  // Sesiones
  getSesionActiva:     (cursoId)      => request('GET', '/api/sesiones/activa' + (cursoId ? `?curso_id=${cursoId}` : '')),
  checkMiAsistencia:   (sesionId, estudianteId) => request('GET', `/api/sesiones/${sesionId}/mi-asistencia?estudiante_id=${estudianteId}`),
  crearSesion:         (nombre_clase, curso_id, profesor_id, tipo = 'clase', visible_alumnos = true) =>
                         request('POST', '/api/sesiones', { nombre_clase, curso_id, profesor_id, tipo, visible_alumnos }),
  cerrarSesion:        (id)           => request('DELETE', `/api/sesiones/${id}`),
  terminarSesion:      (id)           => request('PUT', `/api/sesiones/${id}/terminar`),
  updateSesion:        (id, payload)  => request('PUT', `/api/sesiones/${id}`, payload),
  refrescarToken:      (id)           => request('PUT', `/api/sesiones/${id}/token`),
  activarSesion:       (id)           => request('PUT', `/api/sesiones/${id}/activar`),

  // Asistencias
  registrarAsistencia: (payload)      => request('POST', '/api/asistencias', payload),
  getAsistencias:      (sesion_id)    => request('GET', `/api/asistencias/${sesion_id}`),
  updateAsistencia:    (id, payload)  => request('PUT', `/api/asistencias/${id}`, payload),
  ajustarPunto:        (id, delta)    => request('PUT', `/api/asistencias/${id}/punto`, { delta }),
  crearAsistenciaManual: (payload)    => request('POST', '/api/asistencias/manual', payload),
  getHistorialAlumno:  (id)           => request('GET', `/api/asistencias/alumno/${id}`),
  getHistorialGeneral: ()             => request('GET', '/api/asistencias/historial'),

  // Estudiantes
  getEstudiantes:      ()             => request('GET', '/api/estudiantes'),
  updateEstudiante:    (id, payload)  => request('PUT', `/api/estudiantes/${id}`, payload),
  updatePerfil:        (id, payload)  => request('PUT', `/api/usuarios/${id}/perfil`, payload),
  getEstudianteCursos: (id)           => request('GET', `/api/estudiantes/${id}/cursos`),

  // Usuarios
  getUsuarios:         ()             => request('GET', '/api/usuarios'),
  crearUsuario:        (datos)        => request('POST', '/api/usuarios', datos),
  deleteUsuario:       (id)           => request('DELETE', `/api/usuarios/${id}`),
  buscarUsuario:       (term)         => request('GET', `/api/usuarios/buscar?term=${encodeURIComponent(term)}`),


  // Cursos
  getCursos:           (qs = '')      => request('GET', '/api/cursos' + qs),
  crearCurso:          (datos)        => request('POST', '/api/cursos', datos),
  updateCurso:         (id, datos)    => request('PUT', `/api/cursos/${id}`, datos),
  deleteCurso:         (id)           => request('DELETE', `/api/cursos/${id}`),

  // Cursos → Estudiantes
  getCursoEstudiantes:    (cursoId)               => request('GET', `/api/cursos/${cursoId}/estudiantes`),
  addEstudianteCurso:     (cursoId, estudianteId) => request('POST', `/api/cursos/${cursoId}/estudiantes`, { estudiante_id: estudianteId }),
  removeEstudianteCurso:  (cursoId, estudianteId) => request('DELETE', `/api/cursos/${cursoId}/estudiantes/${estudianteId}`),
  importarAlumnos:        (cursoId, alumnos)      => request('POST', `/api/cursos/${cursoId}/importar`, { alumnos }),
  previewImportarAlumnos: (cursoId, alumnos)      => request('POST', `/api/cursos/${cursoId}/importar/preview`, { alumnos }),

  // Cursos → Sesiones
  getCursoSesiones:    (cursoId)      => request('GET', `/api/cursos/${cursoId}/sesiones`),
  crearCursoSesion:    (cursoId, datos) => request('POST', `/api/cursos/${cursoId}/sesiones`, datos),

  // Cursos → Historial
  getCursoHistorial:   (cursoId)      => request('GET', `/api/cursos/${cursoId}/historial`),

  // Estados de Asistencia
  getEstados:          (profesor_id)  => request('GET', '/api/estados' + (profesor_id ? `?profesor_id=${profesor_id}` : '')),
  crearEstado:         (datos)        => request('POST', '/api/estados', datos),
  updateEstado:        (id, datos)    => request('PUT', `/api/estados/${id}`, datos),
  deleteEstado:        (id)           => request('DELETE', `/api/estados/${id}`),
};
