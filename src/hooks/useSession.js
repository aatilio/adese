import { useState, useCallback, useEffect } from 'react';
import { normalizeSessionUser } from '../constants/roles';

/**
 * Versión del esquema de sesión guardada en localStorage.
 * Incrementar este número invalida TODAS las sesiones activas en todos
 * los navegadores de todos los usuarios, obligándolos a volver a iniciar sesión.
 * Útil si se cambian IDs, estructura del usuario, roles, etc.
 */
const SESSION_VERSION = 2;
const STORAGE_KEY = `sai_user_v${SESSION_VERSION}`;

/** Lee y valida la sesión guardada. Devuelve el objeto de usuario o null. */
function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeSessionUser(parsed);
  } catch {
    return null;
  }
}

/** Elimina claves de versiones anteriores para no acumular basura. */
function purgeOldVersions() {
  for (let v = 1; v < SESSION_VERSION; v++) {
    localStorage.removeItem(`sai_user_v${v}`);
  }
  // Clave sin versión (legado inicial)
  localStorage.removeItem('sai_user');
}

/**
 * Hook que gestiona la sesión del usuario 100% en el navegador (localStorage).
 *
 * Devuelve:
 *  - user:    objeto de sesión actual, o null si no hay sesión activa.
 *  - login:   función para iniciar sesión con un objeto de usuario.
 *  - logout:  función para cerrar sesión.
 */
export function useSession() {
  const [user, setUser] = useState(() => {
    purgeOldVersions();
    return readStoredSession();
  });

  const login = useCallback((rawUser) => {
    const session = normalizeSessionUser(rawUser);
    if (!session) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, login, logout };
}
