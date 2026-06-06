// API ADESE — servidor Node (Docker / local). La misma lógica que /api/index.js (Vercel).

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const QR_SECRET = process.env.QR_SECRET || 'sai-qr-super-secret-key-2024';
const QR_EXPIRY_SECONDS = 60;

/** Roles de usuario */
const ROL_ADMIN      = 1; // Super Admin
const ROL_PROFESOR   = 2; // Profesor
const ROL_ESTUDIANTE = 3; // Estudiante

app.use(cors());
app.use(express.json());

// ── Database Pool ─────────────────────────────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://root:rootpassword@${process.env.DB_HOST || 'localhost'}:5432/asistenciadb`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Test de conexión inicial
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error("❌ Error inicial de conexión a la BD:", err.message);
  } else {
    console.log("✅ Conexión a la base de datos establecida correctamente.");
  }
});

// ── Helpers ───────────────────────────────────────────────────
// Generador de códigos alfanuméricos de 16 caracteres
const generateQrToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Alias por compatibilidad
const generateRandomCode = generateQrToken;

// Rellena automáticamente las inasistencias de una sesión
// force = true ignora los límites de tiempo (usado al cerrar sesión manualmente)
const autoFillAbsences = async (pool, sesionId, force = false) => {
  try {
    // 1. Obtener datos de la sesión
    const sesRes = await pool.query(
      'SELECT curso_id, limite_tarde, activa, faltas_procesadas, tipo FROM sesiones WHERE id = $1',
      [sesionId]
    );
    if (sesRes.rows.length === 0) return;
    const s = sesRes.rows[0];

    // Si ya se procesó y no es un forzado, no hacer nada
    if (s.faltas_procesadas && !force) return;

    // Para sesiones de tipo 'puntos', no auto-llenar faltas
    if (s.tipo === 'puntos') return;

    // 2. ¿Debe llenarse ahora?
    // El auto-falto SOLO se activa al dar "Terminar Sesión" (manual).
    let shouldFill = force;

    if (!shouldFill) {
      return; // No llenar automáticamente por tiempo, solo por orden manual
    }

    if (shouldFill) {
      // 3. Insertar inasistencias para alumnos faltantes
      // estado_id = 4 corresponds to 'Falto'
      await pool.query(`
        INSERT INTO asistencias (estudiante_id, sesion_id, estado_id, fecha_hora)
        SELECT ce.estudiante_id, $1, 4, NOW()
        FROM curso_estudiantes ce
        WHERE ce.curso_id = $2
          AND NOT EXISTS (
            SELECT 1 FROM asistencias a 
            WHERE a.estudiante_id = ce.estudiante_id AND a.sesion_id = $1
          )
      `, [sesionId, s.curso_id]);

      // 4. Marcar como procesada PARA SIEMPRE para esta sesión
      await pool.query('UPDATE sesiones SET faltas_procesadas = true WHERE id = $1', [sesionId]);
      console.log(`[Auto-Falto] Sesión ${sesionId} procesada exitosamente.`);
    }
  } catch (err) {
    console.error("Error en autoFillAbsences:", err.message);
  }
};

// ── Migración Automática ──────────────────────────────────────
const runMigrations = async (pool) => {
  try {
    await pool.query(`
      ALTER TABLE sesiones 
      ADD COLUMN IF NOT EXISTS faltas_procesadas BOOLEAN DEFAULT FALSE;
    `);
  } catch (err) {
    console.error("Error en migración:", err.message);
  }
};

// Ejecutar migración al iniciar
runMigrations(pool);

// ── ROUTES ────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', env: !!(process.env.DATABASE_URL || process.env.DB_HOST) })
);

// POST /api/auth/login — acepta { codigo, pass }. Roles: 1=admin, 2=profesor, 3=estudiante
app.post('/api/auth/login', async (req, res) => {
  const raw  = req.body?.codigo ?? req.body?.codigo_estudiante;
  const pass = req.body?.pass ?? '';
  if (!raw || String(raw).trim() === '') return res.status(400).json({ error: 'Código requerido' });
  try {
    const r = await pool.query(
      'SELECT * FROM usuarios WHERE UPPER(codigo) = UPPER($1)',
      [String(raw).trim()]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Código no encontrado' });
    const u = r.rows[0];
    const rol = Number(u.rol);

    // Verificar contraseña: si el usuario tiene pass definida y no vacía, debe coincidir
    if (u.pass && u.pass !== '') {
      if (String(pass) !== String(u.pass)) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    }
    // Si pass es null o vacía en BD, se permite cualquier contraseña (acceso libre)

    if (rol !== ROL_ADMIN && rol !== ROL_PROFESOR && rol !== ROL_ESTUDIANTE) {
      return res.status(403).json({ error: 'Rol de usuario no válido' });
    }
    res.json({ usuario: { ...u, rol } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sesiones/activa — solo devuelve sesiones de tipo 'clase' o 'evento'
app.get('/api/sesiones/activa', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM sesiones 
      WHERE activa = true 
        AND (tipo = 'clase' OR tipo = 'evento' OR tipo IS NULL)
      LIMIT 1
    `);
    if (r.rows.length === 0) return res.status(404).json({ error: 'No hay sesión activa' });
    res.json({ sesion: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sesiones — crea y activa una sesión. Acepta tipo y visible_alumnos.
app.post('/api/sesiones', async (req, res) => {
  const { nombre_clase, curso_id, tipo, visible_alumnos } = req.body;
  const tipoFinal           = tipo           ?? 'clase';
  const visibleAlumnosFinal = visible_alumnos ?? true;
  try {
    // Deactivate any other active session
    await pool.query('UPDATE sesiones SET activa = false WHERE activa = true');
    const token = generateRandomCode();
    const r = await pool.query(
      `INSERT INTO sesiones (nombre_clase, token_qr, activa, curso_id, fecha_inicio, tipo, visible_alumnos)
       VALUES ($1, $2, true, $3, NOW(), $4, $5) RETURNING *`,
      [nombre_clase, token, curso_id, tipoFinal, visibleAlumnosFinal]
    );
    res.json({ sesion: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sesiones/:id
app.delete('/api/sesiones/:id', async (req, res) => {
  try {
    // ON DELETE CASCADE will handle asistencias
    const r = await pool.query('DELETE FROM sesiones WHERE id = $1 RETURNING *', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sesiones/:id/token
app.put('/api/sesiones/:id/token', async (req, res) => {
  const { id } = req.params;
  const token = generateQrToken(id);
  try {
    const r = await pool.query('UPDATE sesiones SET token_qr = $1 WHERE id = $2 RETURNING *', [token, id]);
    res.json({ sesion: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sesiones/:id — actualiza detalles, incluyendo tipo y visible_alumnos si se proporcionan
app.put('/api/sesiones/:id', async (req, res) => {
  const { nombre_clase, fecha_programada, limite_puntual, limite_presente, limite_tarde, permitir_falto, tipo, visible_alumnos } = req.body;
  try {
    const r = await pool.query(
      `UPDATE sesiones 
       SET nombre_clase = $1,
           fecha_programada = $2,
           limite_puntual = $3,
           limite_presente = $4,
           limite_tarde = $5,
           permitir_falto = $6,
           tipo = COALESCE($7, tipo),
           visible_alumnos = COALESCE($8, visible_alumnos)
       WHERE id = $9 RETURNING *`,
      [nombre_clase, fecha_programada, limite_puntual, limite_presente, limite_tarde, permitir_falto,
       tipo ?? null, visible_alumnos ?? null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ sesion: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/sesiones/:id/activar  (start a scheduled session)
app.put('/api/sesiones/:id/activar', async (req, res) => {
  try {
    // Deactivate any other active session
    await pool.query('UPDATE sesiones SET activa = false WHERE activa = true');
    const token = generateRandomCode();
    const r = await pool.query(
      'UPDATE sesiones SET activa = true, token_qr = $1, fecha_inicio = NOW() WHERE id = $2 RETURNING *',
      [token, req.params.id]
    );
    res.json({ sesion: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/sesiones/:id/refrescar  (rotate QR token)
app.put('/api/sesiones/:id/refrescar', async (req, res) => {
  try {
    const token = generateRandomCode();
    const r = await pool.query(
      'UPDATE sesiones SET token_qr = $1 WHERE id = $2 RETURNING *',
      [token, req.params.id]
    );
    res.json({ sesion: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/sesiones/:id/terminar  (manually end a session)
app.put('/api/sesiones/:id/terminar', async (req, res) => {
  try {
    const sesionId = req.params.id;
    // 1. Desactivar la sesión
    await pool.query('UPDATE sesiones SET activa = false WHERE id = $1', [sesionId]);
    
    // 2. Ejecutar auto-llenado de faltas FORZADO (ignorando el reloj)
    await autoFillAbsences(pool, sesionId, true);
    
    res.json({ ok: true, message: 'Sesión terminada y inasistencias registradas' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/asistencias
app.post('/api/asistencias', async (req, res) => {
  const { token_qr, estudiante_id, estado } = req.body;
  try {
    const alumno = await pool.query('SELECT id, rol FROM usuarios WHERE id = $1', [estudiante_id]);
    if (alumno.rows.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });
    if (Number(alumno.rows[0].rol) !== ROL_ESTUDIANTE) {
      return res.status(403).json({ error: 'Solo los estudiantes pueden registrar asistencia' });
    }

    // Buscamos sesión activa con ese token y su profesor_id asociado al curso
    const sesion = await pool.query(`
      SELECT s.*, c.profesor_id 
      FROM sesiones s
      JOIN cursos c ON s.curso_id = c.id
      WHERE s.token_qr = $1 
      AND (s.activa = true OR s.fecha_programada::date = CURRENT_DATE)
    `, [token_qr]);

    if (sesion.rows.length === 0) return res.status(400).json({ error: 'Código inválido o clase no disponible' });

    const sesionInfo = sesion.rows[0];
    const sesionId = sesionInfo.id;
    const profesorId = sesionInfo.profesor_id;

    // Resolve estado name to estado_id using the correct profesor_id
    const estadoRes = await pool.query('SELECT id FROM estados_asistencia WHERE nombre = $1 AND profesor_id = $2', [estado, profesorId]);
    if (estadoRes.rows.length === 0) return res.status(400).json({ error: 'Estado no válido para este profesor' });
    const estadoId = estadoRes.rows[0].id;

    const existe = await pool.query('SELECT id FROM asistencias WHERE estudiante_id = $1 AND sesion_id = $2', [estudiante_id, sesionId]);
    if (existe.rows.length > 0) return res.status(409).json({ error: 'Asistencia ya registrada' });

    const r = await pool.query(
      'INSERT INTO asistencias (estudiante_id, sesion_id, estado_id) VALUES ($1, $2, $3) RETURNING *',
      [estudiante_id, sesionId, estadoId]
    );
    res.json({ asistencia: { ...r.rows[0], estado } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/estudiantes (usuarios con rol estudiante)
app.get('/api/estudiantes', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM usuarios WHERE rol = $1 ORDER BY nombre_completo',
      [ROL_ESTUDIANTE]
    );
    res.json({ estudiantes: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios (all users with enrolled courses)
app.get('/api/usuarios', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.*, 
        COALESCE(
          json_agg(json_build_object('id', c.id, 'nombre', c.nombre)) 
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS cursos
      FROM usuarios u
      LEFT JOIN curso_estudiantes ce ON ce.estudiante_id = u.id
      LEFT JOIN cursos c ON c.id = ce.curso_id
      GROUP BY u.id
      ORDER BY u.nombre_completo
    `);
    res.json({ usuarios: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/usuarios/buscar?codigo=X — busca usuario por código (case insensitive)
app.get('/api/usuarios/buscar', async (req, res) => {
  const { codigo } = req.query;
  if (!codigo) return res.status(400).json({ error: 'Parámetro codigo requerido' });
  try {
    const r = await pool.query(
      'SELECT * FROM usuarios WHERE UPPER(codigo) = UPPER($1)',
      [String(codigo).trim()]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/usuarios
app.post('/api/usuarios', async (req, res) => {
  const { codigo, nombre_completo, rol, pass } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO usuarios (codigo, nombre_completo, rol, pass) VALUES ($1, $2, $3, $4) RETURNING *',
      [codigo, nombre_completo, rol || ROL_ESTUDIANTE, pass || codigo]
    );
    const newUser = r.rows[0];
    
    // Si es un profesor, le asignamos sus estados base de asistencia
    if (newUser.rol === 2) {
      await pool.query(`
        INSERT INTO estados_asistencia (profesor_id, nombre, color, puntuacion) VALUES
          ($1, 'Puntual',     '#22C55E', 2),
          ($1, 'Presente',    '#3B82F6', 1),
          ($1, 'Tarde',       '#EAB308', 0),
          ($1, 'Falto',       '#EF4444', 0),
          ($1, 'Justificado', '#A855F7', 2),
          ($1, 'Participó',   '#0EA5E9', 1)
      `, [newUser.id]);
    }
    
    res.json({ usuario: { ...newUser, cursos: [] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/usuarios/:id
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/estudiantes/:id (usuarios)
app.put('/api/estudiantes/:id', async (req, res) => {
  const { codigo, nombre_completo, pass, rol } = req.body;
  try {
    let r;
    // Extraemos el rol actual si no se proporciona
    const currentUser = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [req.params.id]);
    const finalRol = rol || (currentUser.rows[0]?.rol ?? 3);

    if (pass !== undefined && pass !== '') {
      r = await pool.query(
        'UPDATE usuarios SET codigo = $1, nombre_completo = $2, pass = $3, rol = $4 WHERE id = $5 RETURNING *',
        [codigo, nombre_completo, pass, finalRol, req.params.id]
      );
    } else {
      r = await pool.query(
        'UPDATE usuarios SET codigo = $1, nombre_completo = $2, rol = $3 WHERE id = $4 RETURNING *',
        [codigo, nombre_completo, finalRol, req.params.id]
      );
    }
    res.json({ estudiante: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id/perfil
app.put('/api/usuarios/:id/perfil', async (req, res) => {
  const { nombre_completo, pass, passActual } = req.body;
  try {
    if (pass !== undefined) {
      // Validar contraseña actual
      const userRes = await pool.query('SELECT pass FROM usuarios WHERE id = $1', [req.params.id]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const existingPass = userRes.rows[0].pass;
      if (existingPass !== passActual) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }

      const r = await pool.query(
        'UPDATE usuarios SET nombre_completo = $1, pass = $2 WHERE id = $3 RETURNING *',
        [nombre_completo, pass, req.params.id]
      );
      res.json({ usuario: r.rows[0] });
    } else {
      const r = await pool.query(
        'UPDATE usuarios SET nombre_completo = $1 WHERE id = $2 RETURNING *',
        [nombre_completo, req.params.id]
      );
      res.json({ usuario: r.rows[0] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/estudiantes/:id/cursos
app.get('/api/estudiantes/:id/cursos', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT c.* FROM cursos c
      JOIN curso_estudiantes ce ON ce.curso_id = c.id
      WHERE ce.estudiante_id = $1 ORDER BY c.created_at DESC
    `, [req.params.id]);
    res.json({ cursos: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/asistencias/:id
app.put('/api/asistencias/:id', async (req, res) => {
  try {
    // Accept either estado (name) or estado_id
    let estadoId = req.body.estado_id;
    if (!estadoId && req.body.estado) {
      const eRes = await pool.query('SELECT id FROM estados_asistencia WHERE nombre = $1', [req.body.estado]);
      if (eRes.rows.length === 0) return res.status(400).json({ error: 'Estado no válido' });
      estadoId = eRes.rows[0].id;
    }
    const r = await pool.query(
      `UPDATE asistencias SET estado_id = $1 WHERE id = $2
       RETURNING *, (SELECT nombre FROM estados_asistencia WHERE id = $1) AS estado`,
      [estadoId, req.params.id]
    );
    res.json({ asistencia: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/asistencias/:id/punto — incrementa o decrementa valor (puntos) de una asistencia
app.put('/api/asistencias/:id/punto', async (req, res) => {
  const { delta } = req.body; // 1 o -1
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'delta debe ser 1 o -1' });
  try {
    const r = await pool.query(
      `UPDATE asistencias
       SET valor = COALESCE(valor, 0) + $1
       WHERE id = $2
       RETURNING *`,
      [delta, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Asistencia no encontrada' });
    res.json({ asistencia: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/asistencias/alumno/:id — solo devuelve registros con visible_alumnos = true
app.get('/api/asistencias/alumno/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id, ea.nombre AS estado, ea.color, ea.puntuacion, a.fecha_hora, a.valor,
              s.nombre_clase, s.curso_id, s.tipo, s.visible_alumnos
       FROM asistencias a
       JOIN sesiones s ON a.sesion_id = s.id
       JOIN estados_asistencia ea ON ea.id = a.estado_id
       WHERE a.estudiante_id = $1 AND s.visible_alumnos = true
       ORDER BY a.fecha_hora DESC`,
      [req.params.id]
    );
    res.json({ historial: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/asistencias/historial
app.get('/api/asistencias/historial', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id, ea.nombre AS estado, ea.color, ea.puntuacion, a.fecha_hora, a.sesion_id,
              a.estudiante_id, u.nombre_completo, u.codigo,
              s.nombre_clase, s.tipo, s.visible_alumnos
       FROM asistencias a
       JOIN usuarios u ON u.id = a.estudiante_id
       JOIN sesiones s ON s.id = a.sesion_id
       JOIN estados_asistencia ea ON ea.id = a.estado_id
       ORDER BY a.fecha_hora DESC`
    );
    res.json({ historial: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/asistencias/:sesion_id
app.get('/api/asistencias/:sesion_id', async (req, res) => {
  const { sesion_id } = req.params;
  try {
    // Intentar auto-llenar faltas antes de devolver la lista
    await autoFillAbsences(pool, sesion_id);

    const r = await pool.query(
      `SELECT a.id, ea.nombre AS estado, ea.color, ea.puntuacion, a.fecha_hora, a.valor,
              u.nombre_completo, u.codigo
       FROM asistencias a
       JOIN usuarios u ON u.id = a.estudiante_id
       JOIN estados_asistencia ea ON ea.id = a.estado_id
       WHERE a.sesion_id = $1 ORDER BY a.fecha_hora ASC`,
      [sesion_id]
    );
    res.json({ asistencias: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/asistencias/manual
app.post('/api/asistencias/manual', async (req, res) => {
  const { estudiante_id, sesion_id, estado, valor } = req.body;
  try {
    // Verificar si la sesión es tipo 'puntos' y obtener profesor_id
    const sesionRes = await pool.query(`
      SELECT s.tipo, c.profesor_id 
      FROM sesiones s
      JOIN cursos c ON s.curso_id = c.id
      WHERE s.id = $1
    `, [sesion_id]);
    
    if (sesionRes.rows.length === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
    const esPuntos = sesionRes.rows[0].tipo === 'puntos';
    const profesorId = sesionRes.rows[0].profesor_id;

    if (esPuntos) {
      // Tipo puntos: sin estado_id, con valor inicial
      const r = await pool.query(
        'INSERT INTO asistencias (estudiante_id, sesion_id, estado_id, valor) VALUES ($1, $2, NULL, $3) RETURNING *',
        [estudiante_id, sesion_id, valor ?? 0]
      );
      res.json({ asistencia: { ...r.rows[0] } });
    } else {
      // Tipo clase/evento: resolver estado_id
      const eRes = await pool.query('SELECT id FROM estados_asistencia WHERE nombre = $1 AND profesor_id = $2', [estado, profesorId]);
      if (eRes.rows.length === 0) return res.status(400).json({ error: 'Estado no válido para este profesor' });
      const estadoId = eRes.rows[0].id;
      const r = await pool.query(
        'INSERT INTO asistencias (estudiante_id, sesion_id, estado_id) VALUES ($1, $2, $3) RETURNING *',
        [estudiante_id, sesion_id, estadoId]
      );
      res.json({ asistencia: { ...r.rows[0], estado } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── CURSOS ─────────────────────────────────────────────────

// GET /api/cursos — soporta ?profesor_id=X para filtrar por profesor
app.get('/api/cursos', async (req, res) => {
  const { profesor_id } = req.query;
  try {
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM curso_estudiantes ce WHERE ce.curso_id = c.id)::int AS total_alumnos,
        (SELECT COUNT(*) FROM sesiones sc WHERE sc.curso_id = c.id)::int AS total_clases
      FROM cursos c
    `;
    const params = [];
    if (profesor_id) {
      params.push(profesor_id);
      query += ` WHERE c.profesor_id = $1`;
    }
    query += ` ORDER BY c.created_at DESC`;
    const r = await pool.query(query, params);
    res.json({ cursos: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cursos — acepta nombre, descripcion, profesor_id
app.post('/api/cursos', async (req, res) => {
  const { nombre, descripcion, profesor_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO cursos (nombre, descripcion, profesor_id) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion || '', profesor_id || null]
    );
    res.json({ curso: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cursos/:id
app.put('/api/cursos/:id', async (req, res) => {
  const { nombre, descripcion } = req.body;
  try {
    const r = await pool.query(
      'UPDATE cursos SET nombre=$1, descripcion=COALESCE($2, descripcion) WHERE id=$3 RETURNING *',
      [nombre, descripcion, req.params.id]
    );
    res.json({ curso: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cursos/:id
app.delete('/api/cursos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cursos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cursos/:id/estudiantes
app.get('/api/cursos/:id/estudiantes', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.* FROM usuarios u
      JOIN curso_estudiantes ce ON ce.estudiante_id = u.id
      WHERE ce.curso_id = $1 ORDER BY u.nombre_completo
    `, [req.params.id]);
    res.json({ estudiantes: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cursos/:id/estudiantes  (add student to course)
app.post('/api/cursos/:id/estudiantes', async (req, res) => {
  const { estudiante_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO curso_estudiantes (curso_id, estudiante_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, estudiante_id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cursos/:cursoId/estudiantes/:estudianteId
app.delete('/api/cursos/:cursoId/estudiantes/:estudianteId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM curso_estudiantes WHERE curso_id=$1 AND estudiante_id=$2',
      [req.params.cursoId, req.params.estudianteId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cursos/:id/sesiones — incluye tipo y visible_alumnos
app.get('/api/cursos/:id/sesiones', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT sc.*, sc.tipo, sc.visible_alumnos,
        (SELECT COUNT(*) FROM asistencias a WHERE a.sesion_id = sc.id)::int AS total_asistencias
      FROM sesiones sc WHERE sc.curso_id = $1
      ORDER BY sc.fecha_programada DESC NULLS LAST, sc.fecha_inicio DESC
    `, [req.params.id]);
    res.json({ sesiones: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cursos/:id/sesiones  (schedule a class — incluye tipo y visible_alumnos)
app.post('/api/cursos/:id/sesiones', async (req, res) => {
  const { nombre_clase, fecha_programada, limite_puntual, limite_presente, limite_tarde, permitir_falto, tipo, visible_alumnos } = req.body;
  const tipoFinal           = tipo           ?? 'clase';
  const visibleAlumnosFinal = visible_alumnos ?? true;
  try {
    const token = generateRandomCode();
    const r = await pool.query(
      `INSERT INTO sesiones 
        (nombre_clase, token_qr, activa, curso_id, fecha_programada,
         limite_puntual, limite_presente, limite_tarde, permitir_falto,
         tipo, visible_alumnos) 
       VALUES ($1, $2, false, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [nombre_clase, token, req.params.id, fecha_programada,
       limite_puntual, limite_presente, limite_tarde, permitir_falto,
       tipoFinal, visibleAlumnosFinal]
    );
    res.json({ sesion: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cursos/:id/historial — incluye tipo y visible_alumnos desde sesiones
app.get('/api/cursos/:id/historial', async (req, res) => {
  try {
    const cursoId = req.params.id;

    // Auto-llenar faltas para las sesiones de este curso
    const sesionesRes = await pool.query('SELECT id FROM sesiones WHERE curso_id = $1', [cursoId]);
    for (const s of sesionesRes.rows) {
      await autoFillAbsences(pool, s.id);
    }

    const r = await pool.query(`
      SELECT a.id,
             ea.nombre AS estado, ea.color, ea.puntuacion,
             a.valor,
             a.fecha_hora, a.sesion_id,
             a.estudiante_id, u.nombre_completo, u.codigo,
             s.nombre_clase, s.tipo, s.visible_alumnos
      FROM asistencias a
      JOIN usuarios u ON u.id = a.estudiante_id
      JOIN sesiones s ON s.id = a.sesion_id
      LEFT JOIN estados_asistencia ea ON ea.id = a.estado_id
      WHERE s.curso_id = $1
      ORDER BY a.fecha_hora DESC
    `, [cursoId]);
    res.json({ historial: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cursos/:id/importar — importa alumnos al curso (upsert)
app.post('/api/cursos/:id/importar', async (req, res) => {
  const cursoId = req.params.id;
  const { alumnos } = req.body; // [{ codigo, nombre_completo }]
  if (!Array.isArray(alumnos)) return res.status(400).json({ error: 'alumnos debe ser un array' });

  let creados = 0, existentes = 0, vinculados = 0;
  try {
    for (const alumno of alumnos) {
      const { codigo, nombre_completo } = alumno;
      if (!codigo) continue;

      // Intentar insertar usuario; si ya existe, ignorar
      const insertRes = await pool.query(
        `INSERT INTO usuarios (codigo, nombre_completo, rol)
         VALUES (UPPER($1), $2, $3)
         ON CONFLICT (codigo) DO NOTHING
         RETURNING id`,
        [codigo, nombre_completo, ROL_ESTUDIANTE]
      );

      let userId;
      if (insertRes.rows.length > 0) {
        userId = insertRes.rows[0].id;
        creados++;
      } else {
        // Ya existía: buscar su id
        const selRes = await pool.query(
          'SELECT id FROM usuarios WHERE UPPER(codigo) = UPPER($1)',
          [codigo]
        );
        if (selRes.rows.length === 0) continue;
        userId = selRes.rows[0].id;
        existentes++;
      }

      // Vincular al curso (ignorar si ya está inscrito)
      const linkRes = await pool.query(
        `INSERT INTO curso_estudiantes (curso_id, estudiante_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [cursoId, userId]
      );
      if ((linkRes.rowCount ?? 0) > 0) vinculados++;
    }
    res.json({ creados, existentes, vinculados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ESTADOS DE ASISTENCIA (CRUD) ────────────────────────────

// GET /api/estados?profesor_id=X — devuelve solo los del profesor
app.get('/api/estados', async (req, res) => {
  const { profesor_id } = req.query;
  try {
    let r;
    if (profesor_id) {
      r = await pool.query(
        'SELECT * FROM estados_asistencia WHERE profesor_id = $1 ORDER BY id',
        [profesor_id]
      );
    } else {
      r = await pool.query('SELECT * FROM estados_asistencia ORDER BY id');
    }
    res.json({ estados: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/estados — crea estado (global si no se pasa profesor_id, propio si se pasa)
app.post('/api/estados', async (req, res) => {
  const { nombre, color, puntuacion, profesor_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO estados_asistencia (nombre, color, puntuacion, profesor_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, color, Math.round(Number(puntuacion) || 0), profesor_id || null]
    );
    res.json({ estado: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/estados/:id
app.put('/api/estados/:id', async (req, res) => {
  const { nombre, color, puntuacion } = req.body;
  try {
    const r = await pool.query(
      'UPDATE estados_asistencia SET nombre=$1, color=$2, puntuacion=$3 WHERE id=$4 RETURNING *',
      [nombre, color, Math.round(Number(puntuacion) || 0), req.params.id]
    );
    res.json({ estado: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/estados/:id
app.delete('/api/estados/:id', async (req, res) => {
  try {
    const check = await pool.query('SELECT profesor_id FROM estados_asistencia WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Estado no encontrado' });
    const inUse = await pool.query('SELECT COUNT(*) FROM asistencias WHERE estado_id = $1', [req.params.id]);
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: este estado está siendo usado en registros de asistencia' });
    }
    await pool.query('DELETE FROM estados_asistencia WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV !== 'production' || process.env.DOCKER) {
  app.listen(PORT, () => {
    console.log(`API ADESE en http://localhost:${PORT}`);
  });
}

export default app;
