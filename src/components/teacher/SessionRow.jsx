import React from 'react';
import { Play, Eye, Edit2, Trash2 } from 'lucide-react';

export default function SessionRow({
  session,
  isToday,
  isCurrent,
  onActivate,
  onEdit,
  onDelete,
  formatDate,
  formatTime,
}) {
  return (
    <tr>
      <td>
        <div className="tp-table-col-main">
          <strong>{session.nombre_clase}</strong>
          {isToday && <span className="tp-badge-today">Hoy</span>}
        </div>
      </td>
      <td>
        {session.fecha_programada
          ? formatDate(session.fecha_programada)
          : session.fecha_inicio
          ? formatDate(session.fecha_inicio)
          : "-"}
      </td>
      <td>
        {session.fecha_programada
          ? formatTime(session.fecha_programada)
          : session.fecha_inicio
          ? formatTime(session.fecha_inicio)
          : "-"}
      </td>
      <td>
        <div className="tp-session-limits">
          <span className="limit-item limit-p" title="Límite Puntual">
            {session.limite_puntual?.slice(0, 5) || "-"}
          </span>
          <span className="limit-item limit-pr" title="Límite Presente">
            {session.limite_presente?.slice(0, 5) || "-"}
          </span>
          <span className="limit-item limit-t" title="Límite Tarde">
            {session.limite_tarde?.slice(0, 5) || "-"}
          </span>
        </div>
      </td>
      <td>
        <span
          className={`badge-status ${
            session.estado === "Finalizado"
              ? "inactive"
              : session.estado === "En Curso"
              ? "active"
              : "pending"
          }`}
        >
          {session.estado}
        </span>
      </td>
      <td>
        <div className="tp-table-actions">
          {session.estado !== "Finalizado" && session.estado !== "En Curso" && (
            <button
              className="btn btn-icon btn-ghost"
              title="Activar Clase"
              onClick={() => onActivate(session)}
              disabled={isCurrent}
            >
              <Play size={16} />
            </button>
          )}
          {session.estado === "En Curso" && (
            <button
              className="btn btn-icon btn-ghost active"
              title="Ir al Monitor"
              onClick={() => onActivate(session)}
            >
              <Eye size={16} color="var(--primary)" />
            </button>
          )}
          <button
            className="btn btn-icon btn-ghost"
            title="Editar Clase"
            onClick={() => onEdit(session)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn btn-icon btn-ghost btn-danger-hover"
            title="Eliminar Clase"
            onClick={() => onDelete(session)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
