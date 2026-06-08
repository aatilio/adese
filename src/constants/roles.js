/**
 * Valores de `usuarios.rol` (PostgreSQL).
 * 1 = Administrador, 2 = Profesor, 3 = Alumno.
 */
export const ROL = {
  ADMIN: 1,
  PROFESOR: 2,
  ALUMNO: 3,
  // Legacy alias
  ESTUDIANTE: 3,
};

/** Roles usados en la UI (rutas y componentes). */
export const UI_ROLE = {
  ADMIN: 'admin',
  PROFESOR: 'profesor',
  ALUMNO: 'alumno',
};

/**
 * Mapea rol numérico a rol de UI.
 */
export function mapRolToUiRole(rol) {
  const r = Number(rol);
  if (r === ROL.ADMIN) return UI_ROLE.ADMIN;
  if (r === ROL.PROFESOR) return UI_ROLE.PROFESOR;
  if (r === ROL.ALUMNO) return UI_ROLE.ALUMNO;
  return null;
}

/**
 * Normaliza la sesión del usuario para localStorage.
 * Retorna null si el objeto no es válido o le faltan campos obligatorios.
 */
export function normalizeSessionUser(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Campos mínimos requeridos para considerar una sesión válida
  if (!raw.id || !raw.codigo) return null;

  const r = Number(raw.rol);
  const uiRole = mapRolToUiRole(r) || raw.role;
  if (!uiRole) return null;

  const rolNorm = r || (
    uiRole === UI_ROLE.ADMIN    ? ROL.ADMIN    :
    uiRole === UI_ROLE.PROFESOR ? ROL.PROFESOR :
    ROL.ALUMNO
  );

  return { ...raw, rol: rolNorm, role: uiRole };
}

