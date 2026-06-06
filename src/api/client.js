const API = import.meta.env.VITE_API_URL || '';

const request = async (method, path, body) => {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error(`Error parsing JSON for ${method} ${path}. Response:`, text.slice(0, 100));
    throw new Error(`Invalid JSON response from server: ${text.slice(0, 20)}...`);
  }

  if (!res.ok) throw new Error(data?.error || 'Error desconocido');
  return data;
};

export const api = {
  // Auth
  login:          (codigo, pass) => request('POST', '/api/auth/login', { codigo, pass: pass || '' }),

  // Sesiones
  getSesionActiva:() => request('GET', '/api/sesiones/activa'),
  crearSesion:    (nombre_clase, curso_id, tipo='clase', visible_alumnos=true) => request('POST', '/api/sesiones', { nombre_clase, curso_id, tipo, visible_alumnos }),
  cerrarSesion:   (id)               => request('DELETE', `/api/sesiones/${id}`),
  terminarSesion: (id)               => request('PUT', `/api/sesiones/${id}/terminar`),
  updateSesion:   (id, payload)      => request('PUT', `/api/sesiones/${id}`, payload),
  refrescarToken: (id)               => request('PUT', `/api/sesiones/${id}/token`),
  activarSesion:  (id)               => request('PUT', `/api/sesiones/${id}/activar`),

  // Asistencias
  registrarAsistencia: (payload)     => request('POST', '/api/asistencias', payload),
  getAsistencias: (sesion_id)        => request('GET', `/api/asistencias/${sesion_id}`),
  updateAsistencia: (id, payload)    => request('PUT', `/api/asistencias/${id}`, payload),
  ajustarPunto:   (id, delta)        => request('PUT', `/api/asistencias/${id}/punto`, { delta }),
  crearAsistenciaManual: (payload)   => request('POST', '/api/asistencias/manual', payload),
  getHistorialAlumno: (id)           => request('GET', `/api/asistencias/alumno/${id}`),
  getHistorialGeneral: ()            => request('GET', '/api/asistencias/historial'),

  // Estudiantes
  getEstudiantes: ()                 => request('GET', '/api/estudiantes'),
  updateEstudiante: (id, payload)    => request('PUT', `/api/estudiantes/${id}`, payload),
  updatePerfil:     (id, payload)    => request('PUT', `/api/usuarios/${id}/perfil`, payload),
  getEstudianteCursos: (id)          => request('GET', `/api/estudiantes/${id}/cursos`),

  // Usuarios (CRUD completo)
  getUsuarios:     ()                => request('GET', '/api/usuarios'),
  crearUsuario:    (datos)           => request('POST', '/api/usuarios', datos),
  deleteUsuario:   (id)              => request('DELETE', `/api/usuarios/${id}`),
  buscarUsuario:   (codigo)          => request('GET', `/api/usuarios/buscar?codigo=${encodeURIComponent(codigo)}`),


  // Cursos
  getCursos:       (qs='')           => request('GET', '/api/cursos' + qs),
  crearCurso:      (datos)           => request('POST', '/api/cursos', datos),
  updateCurso:     (id, datos)       => request('PUT', `/api/cursos/${id}`, datos),
  deleteCurso:     (id)              => request('DELETE', `/api/cursos/${id}`),

  // Cursos → Estudiantes
  getCursoEstudiantes:    (cursoId)              => request('GET', `/api/cursos/${cursoId}/estudiantes`),
  addEstudianteCurso:     (cursoId, estudianteId)=> request('POST', `/api/cursos/${cursoId}/estudiantes`, { estudiante_id: estudianteId }),
  removeEstudianteCurso:  (cursoId, estudianteId)=> request('DELETE', `/api/cursos/${cursoId}/estudiantes/${estudianteId}`),
  importarAlumnos:        (cursoId, alumnos)     => request('POST', `/api/cursos/${cursoId}/importar`, { alumnos }),

  // Cursos → Sesiones
  getCursoSesiones:       (cursoId)              => request('GET', `/api/cursos/${cursoId}/sesiones`),
  crearCursoSesion:       (cursoId, datos)       => request('POST', `/api/cursos/${cursoId}/sesiones`, datos),

  // Cursos → Historial
  getCursoHistorial:      (cursoId)              => request('GET', `/api/cursos/${cursoId}/historial`),

  // Estados de Asistencia
  getEstados:             (profesor_id)          => request('GET', '/api/estados' + (profesor_id ? `?profesor_id=${profesor_id}` : '')),
  crearEstado:            (datos)                => request('POST', '/api/estados', datos),
  updateEstado:           (id, datos)            => request('PUT', `/api/estados/${id}`, datos),
  deleteEstado:           (id)                   => request('DELETE', `/api/estados/${id}`),
};
